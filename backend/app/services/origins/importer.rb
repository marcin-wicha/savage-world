require "yaml"

module Origins
  class Importer
    class ImportError < StandardError; end

    DEFAULT_PATH = Rails.root.join("db/data/origins/cultures.yml")

    def initialize(path: DEFAULT_PATH)
      @path = path
    end

    def call
      records = load_records
      validate_unique_slugs!(records)

      origins = records.map do |attributes|
        Origin.find_or_initialize_by(slug: attributes["slug"]).tap do |origin|
          origin.assign_attributes(attributes)
        end
      end

      invalid_origins = origins.reject(&:valid?)
      if invalid_origins.any?
        raise ImportError, invalid_origins.map { |origin|
          "#{origin.slug.presence || origin.name}: #{origin.errors.full_messages.to_sentence}"
        }.join("; ")
      end

      Origin.transaction do
        origins.each(&:save!)
      end

      origins.size
    end

    private

    def load_records
      unless File.file?(@path)
        raise ImportError, "Origin data file not found: #{@path}"
      end

      document = YAML.safe_load_file(@path, permitted_classes: [], aliases: false)
      origins = document.is_a?(Hash) ? document["origins"] : document
      unless origins.is_a?(Array)
        raise ImportError, "#{@path} must contain an origins array"
      end

      origins.each_with_index do |origin, index|
        unless origin.is_a?(Hash)
          raise ImportError, "#{@path} contains a non-object origin entry at index #{index}"
        end

        missing = %w[name slug description].reject { |key| origin[key].is_a?(String) && origin[key].present? }
        next if missing.empty?

        raise ImportError, "#{@path} origin at index #{index} is missing: #{missing.join(', ')}"
      end

      origins
    end

    def validate_unique_slugs!(records)
      duplicates = records.group_by { |record| record["slug"] }
        .select { |_slug, grouped| grouped.size > 1 }
        .keys

      return if duplicates.empty?

      raise ImportError, "Duplicate origin slugs: #{duplicates.join(', ')}"
    end
  end
end
