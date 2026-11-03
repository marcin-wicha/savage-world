require "rails_helper"
require "tmpdir"
require "yaml"

RSpec.describe ReferenceData::Artwork do
  {
    origin: [ Origins::Importer, "origins", "dunestriders" ],
    edge: [ Edges::Importer, "edges", "alertness" ],
    hindrance: [ Hindrances::Importer, "hindrances", "bad-eyes" ],
    skill: [ Skills::Importer, "skills", "athletics" ],
    gear: [ Gears::Importer, "gears", "torch" ]
  }.each do |factory, (importer_class, resource, slug)|
    context resource do
      let(:attributes) do
        build(factory, slug: slug).attributes.except("id", "created_at", "updated_at", "artwork_url").tap do |values|
          values["cost"] = values["cost"].to_f if values["cost"]
        end
      end
      let(:url) { YAML.safe_load_file(Rails.root.join("db/data/artwork.yml")).fetch(resource).fetch(slug) }

      def import_artwork(importer_class, resource, attributes)
        Dir.mktmpdir do |dir|
          path = File.join(dir, "data.yml")
          File.write(path, YAML.safe_dump(resource => [ attributes ]))
          importer = resource == "origins" ? importer_class.new(path: path) : importer_class.new(paths: [ path ])
          importer.call
        end
      end

      it "defaults new imports and preserves overrides, including null, on repeat imports" do
        import_artwork(importer_class, resource, attributes)
        record = factory.to_s.classify.constantize.find_by!(slug: slug)
        expect(record.artwork_url).to eq(url)

        [ "/custom.webp", nil, "" ].each do |override|
          record.update!(artwork_url: override)
          [ attributes, attributes.merge("artwork_url" => "/source.webp") ].each do |source|
            import_artwork(importer_class, resource, source)
            expect(record.reload.artwork_url).to eq(override)
          end
        end
      end

      it "honors explicit artwork, including null, on new imports" do
        [ "/explicit.webp", nil ].each do |override|
          import_artwork(importer_class, resource, attributes.merge("artwork_url" => override))
          record = factory.to_s.classify.constantize.find_by!(slug: slug)
          expect(record.artwork_url).to eq(override)
          record.destroy!
        end
      end

      it "leaves unmatched new imports without artwork" do
        import_artwork(importer_class, resource, attributes.merge("slug" => "no-artwork-match"))
        expect(factory.to_s.classify.constantize.find_by!(slug: "no-artwork-match").artwork_url).to be_nil
      end
    end
  end

  it "maps resource slugs to same-origin media paths without requiring frontend assets at runtime" do
    manifest = YAML.safe_load_file(Rails.root.join("db/data/artwork.yml"))
    paths = {
      "origins" => [ "origins", "webp" ], "gears" => [ "gear", "webp" ],
      "edges" => [ "traits/edges", "png" ], "hindrances" => [ "traits/hindrances", "png" ],
      "skills" => [ "traits/skills", "png" ]
    }
    expect(manifest.keys).to match_array(paths.keys)
    manifest.each do |resource, entries|
      directory, extension = paths.fetch(resource)
      expect(entries).not_to be_empty
      entries.each do |slug, url|
        expect(url).to eq("/#{directory}/#{slug}.#{extension}")
      end
    end
  end
end
