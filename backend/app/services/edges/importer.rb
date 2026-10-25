require "yaml"

module Edges
  class Importer
    class ImportError < StandardError; end

    DEFAULT_PATHS = [
      Rails.root.join("db/data/edges/swade.yml"),
      Rails.root.join("db/data/edges/private/*.yml")
    ].freeze

    def initialize(paths: DEFAULT_PATHS)
      @paths = Array(paths)
    end

    def call
      records = load_records
      validate_unique_slugs!(records)
      validate_edge_references!(records)
      assign_edge_names!(records)

      edges = records.map do |attributes|
        Edge.find_or_initialize_by(slug: attributes["slug"]).tap do |edge|
          edge.assign_attributes(attributes)
        end
      end

      invalid_edges = edges.reject(&:valid?)
      if invalid_edges.any?
        raise ImportError, invalid_edges.map { |edge|
          "#{edge.slug.presence || edge.name}: #{edge.errors.full_messages.to_sentence}"
        }.join("; ")
      end

      Edge.transaction do
        edges.each(&:save!)
      end

      edges.size
    end

    private

    def load_records
      files = data_files
      raise ImportError, "No edge data files found" if files.empty?

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

        edges = document.is_a?(Hash) ? document["edges"] : document
        unless edges.is_a?(Array)
          raise ImportError, "#{file} must contain an edges array"
        end

        book = document.is_a?(Hash) ? document["book"] : nil
        edges.each do |edge|
          unless edge.is_a?(Hash)
            raise ImportError, "#{file} contains a non-object edge entry"
          end

          edge["source_book"] ||= book
          edge["effects"] ||= []
          records << edge
        end
      end

      apply_description_overlays!(records, description_overlays)
      records
    end

    def apply_description_overlays!(records, overlays)
      unless overlays.all? { |overlay| overlay.is_a?(Hash) && overlay["slug"].present? && overlay.key?("description") }
        raise ImportError, "Edge descriptions must include slug and description"
      end

      duplicates = overlays.group_by { |overlay| overlay["slug"] }
        .select { |_slug, grouped| grouped.size > 1 }
        .keys
      raise ImportError, "Duplicate edge description slugs: #{duplicates.join(', ')}" if duplicates.any?

      records_by_slug = records.index_by { |record| record["slug"] }
      overlays.each do |overlay|
        record = records_by_slug[overlay["slug"]]
        raise ImportError, "Unknown edge description slug: #{overlay["slug"]}" unless record

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

      raise ImportError, "Duplicate edge slugs: #{duplicates.join(', ')}"
    end

    def validate_edge_references!(records)
      known_slugs = records.filter_map { |record| record["slug"] }
      referenced_slugs = records.flat_map { |record| edge_references(record["requirements"]) }.uniq
      missing_slugs = referenced_slugs - known_slugs

      return if missing_slugs.empty?

      raise ImportError, "Unknown edge requirements: #{missing_slugs.sort.join(', ')}"
    end

    def edge_references(requirements)
      Array(requirements).flat_map do |clause|
        next [] unless clause.is_a?(Hash)

        case clause["kind"]
        when "edge" then [ clause["slug"] ]
        when "any" then edge_references(clause["clauses"])
        else []
        end
      end
    end

    def assign_edge_names!(records)
      names_by_slug = records.filter_map do |record|
        [ record["slug"], record["name"] ] if record["slug"].present?
      end.to_h

      records.each { |record| assign_edge_names(record["requirements"], names_by_slug) }
    end

    def assign_edge_names(requirements, names_by_slug)
      Array(requirements).each do |clause|
        next unless clause.is_a?(Hash)

        case clause["kind"]
        when "edge"
          clause["name"] = names_by_slug[clause["slug"]]
        when "any"
          assign_edge_names(clause["clauses"], names_by_slug)
        end
      end
    end
  end
end
