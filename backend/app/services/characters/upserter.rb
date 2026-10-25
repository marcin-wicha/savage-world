module Characters
  class Upserter
    SELECTIONS = {
      edge_ids: Edge,
      hindrance_ids: Hindrance,
      skill_ids: Skill
    }.freeze

    attr_reader :character, :errors

    def initialize(character:, attributes:, require_hindrance_balance: false)
      @character = character
      @attributes = attributes
      @require_hindrance_balance = require_hindrance_balance
      @errors = {}
      @created = character.new_record?
    end

    def call
      prepare_selections
      prepare_origin
      prepare_hindrance_points
      return false if errors.any?

      Character.transaction do
        character.assign_attributes(@attributes.slice(:name, :rank))
        character.origin = @origin if @origin_provided
        character.save!
        apply_selections
      end

      true
    rescue ActiveRecord::RecordInvalid => error
      @errors = error.record.errors.to_hash
      false
    end

    def created?
      @created
    end

    private

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
      unless has_point_fields
        if @require_hindrance_balance
          errors[:hindrance_points] = [ "must include earned and spent hindrance points" ]
        end
        return
      end
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
  end
end
