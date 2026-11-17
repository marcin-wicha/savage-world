module Battles
  class Settings
    ILLUMINATION = { "bright" => 0, "dim" => -2, "dark" => -4, "pitch_dark" => -6 }.freeze
    COVER = { "none" => 0, "light" => -2, "medium" => -4, "heavy" => -6 }.freeze
    DEFAULTS = {
      "starting_distance" => 12,
      "illumination" => "bright",
      "cover" => "none",
      "max_rounds" => 20,
      "morale" => false
    }.freeze
    LIMITS = { "starting_distance" => 1..60, "max_rounds" => 1..30 }.freeze

    attr_reader :errors

    def initialize(raw = {})
      @raw = (raw || {}).to_h.stringify_keys
      @errors = []
      @values = DEFAULTS.merge(@raw.slice(*DEFAULTS.keys))
      normalize
    end

    def valid?
      errors.empty?
    end

    def [](key)
      @values.fetch(key.to_s)
    end

    def illumination_modifier
      ILLUMINATION.fetch(self["illumination"])
    end

    def cover_modifier
      COVER.fetch(self["cover"])
    end

    def to_h
      @values.dup
    end

    private

    def normalize
      unknown = @raw.keys - DEFAULTS.keys
      errors << "unknown settings: #{unknown.join(', ')}" if unknown.any?

      LIMITS.each do |key, range|
        value = Integer(@values[key].to_s, 10, exception: false)
        if value && range.cover?(value)
          @values[key] = value
        else
          errors << "#{key} must be between #{range.min} and #{range.max}"
        end
      end

      errors << "illumination must be one of #{ILLUMINATION.keys.join(', ')}" unless ILLUMINATION.key?(@values["illumination"])
      errors << "cover must be one of #{COVER.keys.join(', ')}" unless COVER.key?(@values["cover"])

      morale = ActiveModel::Type::Boolean.new.cast(@values["morale"])
      if morale.nil?
        errors << "morale must be true or false"
      else
        @values["morale"] = morale
      end
    end
  end
end
