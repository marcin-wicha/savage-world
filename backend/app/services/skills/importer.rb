require "yaml"

module Skills
  class Importer
    class ImportError < StandardError; end

    DEFAULT_PATHS = [
      Rails.root.join("db/data/skills/swade.yml"),
      Rails.root.join("db/data/skills/private/*.yml")
    ].freeze

    def initialize(paths: DEFAULT_PATHS)
      @paths = Array(paths)
    end

    def call
      records = load_records
      validate_unique_slugs!(records)

      skills = records.map do |attributes|
        Skill.find_or_initialize_by(slug: attributes["slug"]).tap do |skill|
          skill.assign_attributes(attributes)
        end
      end

      invalid_skills = skills.reject(&:valid?)
      if invalid_skills.any?
        raise ImportError, invalid_skills.map { |skill|
          "#{skill.slug.presence || skill.name}: #{skill.errors.full_messages.to_sentence}"
        }.join("; ")
      end

      Skill.transaction do
        skills.each(&:save!)
      end

      skills.size
    end

    private

    def load_records
      files = data_files
      raise ImportError, "No skill data files found" if files.empty?

      records = []
      description_overlays = []
      files.each do |file|
        document = YAML.safe_load_file(file, permitted_classes: [], aliases: false)
        if document.is_a?(Hash) && document.key?("descriptions")
          descriptions = document["descriptions"]
          unless descriptions.is_a?(Array)
            raise ImportError, "#{file} must contain a descriptions array"
          end

          description_overlays.concat(descriptions)
          next
        end

        skills = document.is_a?(Hash) ? document["skills"] : document
        unless skills.is_a?(Array)
          raise ImportError, "#{file} must contain a skills array"
        end

        book = document.is_a?(Hash) ? document["book"] : nil
        skills.each do |skill|
          unless skill.is_a?(Hash)
            raise ImportError, "#{file} contains a non-object skill entry"
          end

          skill["source_book"] ||= book
          records << skill
        end
      end

      apply_description_overlays!(records, description_overlays)
      records
    end

    def apply_description_overlays!(records, overlays)
      unless overlays.all? { |overlay| overlay.is_a?(Hash) && overlay["slug"].present? && overlay.key?("description") }
        raise ImportError, "Skill descriptions must include slug and description"
      end

      duplicates = overlays.group_by { |overlay| overlay["slug"] }
        .select { |_slug, grouped| grouped.size > 1 }
        .keys
      raise ImportError, "Duplicate skill description slugs: #{duplicates.join(', ')}" if duplicates.any?

      records_by_slug = records.index_by { |record| record["slug"] }
      overlays.each do |overlay|
        record = records_by_slug[overlay["slug"]]
        raise ImportError, "Unknown skill description slug: #{overlay["slug"]}" unless record

        record["description"] = overlay["description"]
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

      return if duplicates.empty?

      raise ImportError, "Duplicate skill slugs: #{duplicates.join(', ')}"
    end
  end
end
