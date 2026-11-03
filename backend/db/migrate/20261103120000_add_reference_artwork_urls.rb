require "yaml"

class AddReferenceArtworkUrls < ActiveRecord::Migration[8.1]
  def up
    %i[origins edges hindrances skills].each do |table|
      add_column table, :artwork_url, :string
    end

    backfill_artwork
  end

  def down
    %i[origins edges hindrances skills].each do |table|
      remove_column table, :artwork_url
    end
  end

  private

  def backfill_artwork
    manifest = YAML.safe_load_file(File.expand_path("../data/artwork.yml", __dir__))
    manifest.each do |table, entries|
      entries.each do |slug, url|
        execute <<~SQL
          UPDATE #{quote_table_name(table)}
          SET artwork_url = #{connection.quote(url)}
          WHERE slug = #{connection.quote(slug)}
            AND (artwork_url IS NULL OR TRIM(artwork_url) = '')
        SQL
      end
    end
  end
end
