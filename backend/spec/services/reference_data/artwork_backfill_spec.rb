require "rails_helper"
require Rails.root.join("db/migrate/20261103120000_add_reference_artwork_urls")

RSpec.describe AddReferenceArtworkUrls do
  it "backfills only blank matching artwork without replacing overrides" do
    { origin: "dunestriders", edge: "alertness", hindrance: "bad-eyes", skill: "athletics", gear: "torch" }.each do |factory, slug|
      record = create(factory, slug: slug, artwork_url: nil)
      migration = described_class.new
      manifest = YAML.safe_load_file(Rails.root.join("db/data/artwork.yml"))
      url = manifest.fetch(record.class.table_name).fetch(slug)

      [ nil, "", "  " ].each do |blank|
        record.update!(artwork_url: blank)
        migration.suppress_messages { migration.send(:backfill_artwork) }
        expect(record.reload.artwork_url).to eq(url)
      end

      record.update!(artwork_url: "/override.webp")
      migration.suppress_messages { migration.send(:backfill_artwork) }
      expect(record.reload.artwork_url).to eq("/override.webp")
    end

    unmatched = create(:origin, slug: "unmatched", artwork_url: nil)
    described_class.new.suppress_messages { described_class.new.send(:backfill_artwork) }
    expect(unmatched.reload.artwork_url).to be_nil
  end
end
