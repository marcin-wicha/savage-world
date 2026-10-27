require "yaml"

module Powers
  class Importer
    class ImportError < StandardError; end

    DEFAULT_PATHS = [
      Rails.root.join("db/data/powers/swade.yml"),
      Rails.root.join("db/data/powers/private/*.yml")
    ].freeze

    def initialize(paths: DEFAULT_PATHS)
      @paths = Array(paths)
    end

    def call
      records = load_records
      validate_unique_slugs!(records)

      powers = records.map do |attributes|
        Power.find_or_initialize_by(slug: attributes["slug"]).tap do |power|
          power.assign_attributes(attributes)
        end
      end

      invalid_powers = powers.reject(&:valid?)
      if invalid_powers.any?
        raise ImportError, invalid_powers.map { |power|
          "#{power.slug.presence || power.name}: #{power.errors.full_messages.to_sentence}"
        }.join("; ")
      end

      Power.transaction { powers.each(&:save!) }
      powers.size
    end

    private

    def load_records
      files = data_files
      return [] if files.empty?

      files.flat_map do |file|
        document = YAML.safe_load_file(file, permitted_classes: [], aliases: false)
        powers = document.is_a?(Hash) ? document["powers"] : document
        raise ImportError, "#{file} must contain a powers array" unless powers.is_a?(Array)

        book = document.is_a?(Hash) ? document["book"] : nil
        page = document.is_a?(Hash) ? document["page"] : nil
        powers.map do |power|
          raise ImportError, "#{file} contains a non-object power entry" unless power.is_a?(Hash)

          power["slug"] ||= power["name"].to_s.parameterize
          power["source_book"] ||= book
          power["source_page"] ||= page
          power
        end
      end
    end

    def data_files
      @paths.flat_map do |path|
        path = path.to_s
        path.include?("*") ? Dir[path].sort : [ path ]
      end.select { |path| File.file?(path) }
    end

    def validate_unique_slugs!(records)
      duplicates = records.group_by { |record| record["slug"] }
        .select { |_slug, grouped| grouped.size > 1 }
        .keys
      raise ImportError, "Duplicate power slugs: #{duplicates.join(', ')}" if duplicates.any?
    end
  end
end
