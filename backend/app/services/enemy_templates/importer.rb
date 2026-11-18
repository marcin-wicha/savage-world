require "yaml"

module EnemyTemplates
  class Importer
    class ImportError < StandardError; end

    DEFAULT_PATHS = [ Rails.root.join("db/data/bestiary/private/core.yml"),
      Rails.root.join("db/data/bestiary/private/fantasy.yml") ].freeze

    FIELDS = %w[name description wild_card attribute_dice skills pace parry toughness armor size bennies weapons edge_slugs abilities].freeze

    def initialize(user:, paths: DEFAULT_PATHS)
      @user = user
      @paths = paths
    end

    def call
      entries = @paths.filter_map { |path| load_file(path) }.flat_map { |document| document.fetch("monsters") }
      entries = entries.index_by { |entry| entry.fetch("source_key") }.values
      templates = entries.map do |entry|
        @user.enemy_templates.find_or_initialize_by(source_key: entry.fetch("source_key")).tap do |template|
          template.assign_attributes(entry.slice(*FIELDS))
        end
      end
      invalid = templates.reject(&:valid?)
      if invalid.any?
        raise ImportError, invalid.map { |template| "#{template.source_key}: #{template.errors.full_messages.to_sentence}" }.join("; ")
      end

      EnemyTemplate.transaction { templates.each(&:save!) }
      templates.size
    end

    private

    def load_file(path)
      return unless File.file?(path)

      document = YAML.safe_load_file(path, permitted_classes: [], aliases: false)
      entries = document.is_a?(Hash) && document["monsters"]
      raise ImportError, "#{path} must contain a monsters array" unless entries.is_a?(Array)

      entries.each do |entry|
        unless entry.is_a?(Hash) && entry["source_key"].is_a?(String) && entry["source_key"].present?
          raise ImportError, "#{path} contains a monster without a source_key"
        end
      end
      document
    end
  end
end
