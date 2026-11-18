module Characters
  # Applies unsaved wizard choices to a throwaway character inside a transaction
  # that is always rolled back, so the builder shows the same server-side Pace,
  # Parry, and Toughness rules the character API and battles use.
  class DerivedPreview
    attr_reader :derived, :errors

    def initialize(character:, attributes:)
      @character = character
      @attributes = attributes
      @errors = {}
    end

    def call
      Character.transaction do
        upserter = Upserter.new(character: @character, attributes: @attributes)
        if upserter.call
          @character.reload
          traits = EffectiveTraits.new(@character).as_json
          @derived = DerivedStats.new(@character, effective_traits: traits).as_json
        else
          @errors = upserter.errors
        end
        raise ActiveRecord::Rollback
      end

      errors.empty?
    end
  end
end
