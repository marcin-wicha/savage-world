require "yaml"

module ReferenceData
  module Artwork
    def self.attributes_for(record, attributes)
      return attributes.except("artwork_url") unless record.new_record?
      return attributes if attributes.key?("artwork_url")

      manifest = YAML.safe_load_file(Rails.root.join("db/data/artwork.yml"))
      url = manifest.fetch(record.class.table_name).fetch(attributes["slug"], nil)
      attributes.merge("artwork_url" => url)
    end
  end
end
