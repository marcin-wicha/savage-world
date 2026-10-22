module Characters
  class Upserter
    SELECTIONS = {
      edge_ids: Edge,
      hindrance_ids: Hindrance,
      skill_ids: Skill
    }.freeze

    attr_reader :character, :errors

    def initialize(character:, attributes:)
      @character = character
      @attributes = attributes
      @errors = {}
      @created = character.new_record?
    end

    def call
      prepare_selections
      return false if errors.any?

      Character.transaction do
        character.assign_attributes(@attributes.slice(:name, :rank))
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
