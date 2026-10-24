require "yaml"

module Gears
  class Importer
    class ImportError < StandardError; end

    DEFAULT_PATHS = [
      Rails.root.join("db/data/gear/swade.yml"),
      Rails.root.join("db/data/gear/private/*.yml")
    ].freeze

    def initialize(paths: DEFAULT_PATHS)
      @paths = Array(paths)
    end

    def call
      records = load_records
      validate_unique_slugs!(records)

      gears = records.map do |attributes|
        Gear.find_or_initialize_by(slug: attributes["slug"]).tap do |gear|
          gear.assign_attributes(attributes)
        end
      end

      invalid_gears = gears.reject(&:valid?)
      if invalid_gears.any?
        raise ImportError, invalid_gears.map { |gear|
          "#{gear.slug.presence || gear.name}: #{gear.errors.full_messages.to_sentence}"
        }.join("; ")
      end

      Gear.transaction do
        gears.each(&:save!)
      end

      gears.size
    end

    private

    def load_records
      files = data_files
      return [] if files.empty?

      records = []
      files.each do |file|
        document = YAML.safe_load_file(file, permitted_classes: [], aliases: false)
        gears = document.is_a?(Hash) ? document["gears"] : document
        unless gears.is_a?(Array)
          raise ImportError, "#{file} must contain a gears array"
        end

        book = document.is_a?(Hash) ? document["book"] : nil
        gears.each do |gear|
          unless gear.is_a?(Hash)
            raise ImportError, "#{file} contains a non-object gear entry"
          end

          gear["source_book"] ||= book
          gear["slug"] ||= gear["name"].to_s.parameterize
          gear["requirements"] ||= []
          gear["effects"] ||= {}
          gear["cost_text"] ||= gear["cost"].present? ? gear["cost"].to_s : "—"
          records << gear
        end
      end

      records
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

      raise ImportError, "Duplicate gear slugs: #{duplicates.join(', ')}"
    end
  end
end
