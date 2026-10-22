require "yaml"

module Hindrances
  class Importer
    class ImportError < StandardError; end

    DEFAULT_PATHS = [
      Rails.root.join("db/data/hindrances/swade.yml"),
      Rails.root.join("db/data/hindrances/private/*.yml")
    ].freeze

    def initialize(paths: DEFAULT_PATHS)
      @paths = Array(paths)
    end

    def call
      records = load_records
      validate_unique_slugs!(records)

      hindrances = records.map do |attributes|
        Hindrance.find_or_initialize_by(slug: attributes["slug"]).tap do |hindrance|
          hindrance.assign_attributes(attributes)
        end
      end

      invalid_hindrances = hindrances.reject(&:valid?)
      if invalid_hindrances.any?
        raise ImportError, invalid_hindrances.map { |hindrance|
          "#{hindrance.slug.presence || hindrance.name}: #{hindrance.errors.full_messages.to_sentence}"
        }.join("; ")
      end

      Hindrance.transaction do
        hindrances.each(&:save!)
      end

      hindrances.size
    end

    private

    def load_records
      files = data_files
      raise ImportError, "No hindrance data files found" if files.empty?

      files.flat_map do |file|
        document = YAML.safe_load_file(file, permitted_classes: [], aliases: false)
        hindrances = document.is_a?(Hash) ? document["hindrances"] : document
        unless hindrances.is_a?(Array)
          raise ImportError, "#{file} must contain a hindrances array"
        end

        book = document.is_a?(Hash) ? document["book"] : nil
        hindrances.map do |hindrance|
          unless hindrance.is_a?(Hash)
            raise ImportError, "#{file} contains a non-object hindrance entry"
          end

          hindrance["source_book"] ||= book
          hindrance
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

      raise ImportError, "Duplicate hindrance slugs: #{duplicates.join(', ')}"
    end
  end
end
