module Characters
  class Upserter
    SELECTIONS = {
      edge_ids: Edge,
      hindrance_ids: Hindrance,
      skill_ids: Skill
    }.freeze

    LIFECYCLE_STATUSES = %w[alive dead].freeze

    attr_reader :character, :errors

    # finalize: true applies the changes and then enforces the full creation
    # rules, turning a draft into a living character in the same transaction.
    def initialize(character:, attributes:, finalize: false)
      @character = character
      @attributes = attributes
      @finalize = finalize
      @errors = {}
      @created = character.new_record?
    end

    def call
      prepare_selections
      prepare_origin
      prepare_hindrance_severities
      prepare_hindrance_points
      prepare_status
      return false if errors.any?

      prepare_skill_dice
      prepare_gear
      return false if errors.any?

      Character.transaction do
        character.assign_attributes(@attributes.slice(:name, :rank, :concept, :creation_step))
        character.status = @status if @status
        character.attribute_dice = @attributes[:attributes] if @attributes.key?(:attributes)
        character.origin = @origin if @origin_provided
        character.save!
        apply_selections
        apply_hindrance_severities
        apply_skill_dice
        apply_gear
        finalize! if @finalize
      end

      errors.empty?
    rescue ActiveRecord::RecordInvalid => error
      @errors = error.record.errors.to_hash
      false
    end

    def created?
      @created
    end

    private

    def finalize!
      character.reload
      messages = {}
      messages[:name] = [ "can't be blank" ] if character.name.blank?
      messages[:origin_id] = [ "must be chosen" ] if character.origin_id.nil?
      messages.merge!(CreationPoints.new(character).errors)

      if messages.any?
        @errors = messages
        raise ActiveRecord::Rollback
      end

      character.update!(status: :alive, creation_step: 0)
    end

    def prepare_status
      return unless @attributes.key?(:status)

      status = @attributes[:status].to_s
      if character.new_record? || character.draft?
        errors[:status] = [ "can only change after the character is finalized" ]
      elsif !LIFECYCLE_STATUSES.include?(status)
        errors[:status] = [ "must be alive or dead" ]
      else
        @status = status
      end
    end

    def prepare_hindrance_severities
      return unless @attributes.key?(:hindrance_severities)

      severities = @attributes[:hindrance_severities]
      unless severities.is_a?(Hash) && severities.values.all? { |value| CharacterHindrance::SEVERITIES.include?(value) }
        errors[:hindrance_severities] = [ "must map hindrance ids to minor or major" ]
        return
      end

      @hindrance_severities = severities.transform_keys(&:to_s)
    end

    def apply_hindrance_severities
      return unless @hindrance_severities || @selections.key?(:hindrance_ids)

      character.character_hindrances.includes(:hindrance).each do |selection|
        next selection.update!(severity: nil) unless selection.hindrance.severity == "minor_or_major"

        chosen = @hindrance_severities&.fetch(selection.hindrance_id.to_s, nil)
        selection.update!(severity: chosen || selection.severity || "minor")
      end
    end

    def prepare_selections
      @selections = {}

      SELECTIONS.each do |key, model|
        next unless @attributes.key?(key)

        ids, invalid = normalize_ids(@attributes[key])
        if invalid.any?
          errors[key] = [ "must contain only integer ids" ]
          next
        end

        missing = ids - model.where(id: ids).pluck(:id)
        if missing.any?
          errors[key] = [ "contains unknown ids: #{missing.join(', ')}" ]
          next
        end

        @selections[key] = ids
      end
    end

    def prepare_skill_dice
      return unless @attributes.key?(:skill_dice)

      dice = @attributes[:skill_dice]
      unless dice.is_a?(Hash)
        errors[:skill_dice] = [ "must be an object keyed by skill id" ]
        return
      end

      selected_ids = @selections.fetch(:skill_ids, character.skill_ids)
      @skill_dice = {}
      dice.each do |raw_id, die|
        id = Integer(raw_id, exception: false)
        if id.nil? || !selected_ids.include?(id)
          errors[:skill_dice] = [ "may only include selected skill ids" ]
          return
        end
        unless CharacterSkill::DICE.include?(die)
          errors[:skill_dice] = [ "must use d4, d6, d8, d10, or d12" ]
          return
        end

        @skill_dice[id] = die
      end
    end

    def prepare_gear
      if @attributes.key?(:gear)
        @gear = normalize_gear(@attributes[:gear])
        return if errors.key?(:gear)
      end

      return unless @attributes.key?(:equipped_gear_ids)

      ids, invalid = normalize_ids(@attributes[:equipped_gear_ids])
      owned_ids = @gear ? @gear.keys : character.character_gears.map(&:gear_id)
      if invalid.any? || (ids - owned_ids).any?
        errors[:equipped_gear_ids] = [ "may only include owned gear ids" ]
        return
      end

      @equipped_gear_ids = ids
    end

    def normalize_gear(value)
      unless value.is_a?(Hash)
        errors[:gear] = [ "must be an object keyed by gear id" ]
        return nil
      end

      gear = {}
      value.each do |raw_id, raw_quantity|
        id = Integer(raw_id.to_s, 10, exception: false)
        quantity = Integer(raw_quantity.to_s, 10, exception: false)
        unless id && quantity&.between?(1, 99)
          errors[:gear] = [ "must map gear ids to quantities between 1 and 99" ]
          return nil
        end

        gear[id] = quantity
      end

      missing = gear.keys - Gear.where(id: gear.keys, hidden: false).pluck(:id)
      errors[:gear] = [ "contains unknown ids: #{missing.join(', ')}" ] if missing.any?
      gear
    end

    def prepare_origin
      return unless @attributes.key?(:origin_id)

      @origin_provided = true
      return if @attributes[:origin_id].nil?

      origin_id = Integer(@attributes[:origin_id], exception: false)
      if origin_id.nil?
        errors[:origin_id] = [ "must be an integer id or null" ]
        return
      end

      @origin = Origin.find_by(id: origin_id)
      return if @origin

      errors[:origin_id] = [ "contains unknown id: #{origin_id}" ]
    end

    def prepare_hindrance_points
      has_point_fields = @attributes.key?(:hindrance_points_spent) && @attributes.key?(:hindrance_points_earned)
      return if !has_point_fields || @finalize
      return if errors.key?(:hindrance_ids)

      spent = normalize_points(@attributes[:hindrance_points_spent], :hindrance_points_spent)
      reported_earned = normalize_points(@attributes[:hindrance_points_earned], :hindrance_points_earned)
      return if errors.any?

      earned = hindrance_points_earned
      if earned > 4
        errors[:hindrance_points_earned] = [ "cannot exceed 4" ]
        return
      end

      if reported_earned != earned
        errors[:hindrance_points_earned] = [ "does not match selected hindrances" ]
      end
      errors[:hindrance_points_spent] = [ "must spend all earned hindrance points before saving" ] if spent != earned
    end

    def hindrance_points_earned
      severities = @attributes[:hindrance_severities] || {}

      @selections.fetch(:hindrance_ids, []).sum do |id|
        hindrance = Hindrance.find(id)
        severity = hindrance.severity
        if severity == "minor_or_major"
          selected = severities[id.to_s] || severities[id] || "minor"
          unless %w[minor major].include?(selected)
            errors[:hindrance_severities] = [ "must specify minor or major for #{id}" ]
            selected = "minor"
          end
          severity = selected
        end

        severity == "major" ? 2 : 1
      end
    end

    def normalize_points(value, key)
      points = Integer(value, exception: false)
      return points if points && points.between?(0, 4)

      errors[key] = [ "must be an integer between 0 and 4" ]
      0
    end

    def normalize_ids(value)
      raw_ids = Array(value)
      invalid = raw_ids.reject { |id| Integer(id, exception: false) }
      ids = raw_ids.filter_map { |id| Integer(id, exception: false) }.uniq

      [ ids, invalid ]
    end

    def apply_selections
      @selections.each do |key, ids|
        character.public_send(:"#{key}=", ids)
      end
    end

    def apply_skill_dice
      return unless @selections.key?(:skill_ids) || @attributes.key?(:skill_dice)

      character.character_skills.includes(:skill).each do |selection|
        selection.die = @skill_dice&.fetch(selection.skill_id, nil) || default_die(selection.skill)
        selection.save!
      end
    end

    def apply_gear
      return unless @gear || @equipped_gear_ids

      if @gear
        character.character_gears.where.not(gear_id: @gear.keys).destroy_all
        existing = character.character_gears.index_by(&:gear_id)
        @gear.each do |gear_id, quantity|
          selection = existing[gear_id] || character.character_gears.build(gear_id: gear_id)
          selection.quantity = quantity
          selection.equipped = @equipped_gear_ids.include?(gear_id) if @equipped_gear_ids
          selection.save!
        end
      else
        character.character_gears.each do |selection|
          selection.update!(equipped: @equipped_gear_ids.include?(selection.gear_id))
        end
      end
      character.character_gears.reset
    end

    def default_die(skill)
      skill.core? ? "d6" : "d4"
    end
  end
end
