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

      files.flat_map do |file|
        document = YAML.safe_load_file(file, permitted_classes: [], aliases: false)
        skills = document.is_a?(Hash) ? document["skills"] : document
        unless skills.is_a?(Array)
          raise ImportError, "#{file} must contain a skills array"
        end

        book = document.is_a?(Hash) ? document["book"] : nil
        skills.map do |skill|
          unless skill.is_a?(Hash)
            raise ImportError, "#{file} contains a non-object skill entry"
          end

          skill["source_book"] ||= book
          skill
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

      return if duplicates.empty?

      raise ImportError, "Duplicate skill slugs: #{duplicates.join(', ')}"
    end
  end
end
