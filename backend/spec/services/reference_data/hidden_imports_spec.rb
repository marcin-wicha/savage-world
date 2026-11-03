require "rails_helper"
require "tmpdir"
require "yaml"

RSpec.describe "Reference data import visibility" do
  {
    origin: [ Origins::Importer, "origins" ],
    edge: [ Edges::Importer, "edges" ],
    hindrance: [ Hindrances::Importer, "hindrances" ],
    skill: [ Skills::Importer, "skills" ],
    gear: [ Gears::Importer, "gears" ]
  }.each do |factory, (importer_class, resource)|
    it "defaults new #{resource} to visible and preserves admin visibility on repeat imports" do
      Dir.mktmpdir do |dir|
        path = File.join(dir, "data.yml")
        attributes = build(factory).attributes.except("id", "created_at", "updated_at", "artwork_url", "hidden")
        attributes["cost"] = attributes["cost"].to_f if attributes["cost"]
        File.write(path, YAML.safe_dump(resource => [ attributes ]))
        importer = resource == "origins" ? importer_class.new(path: path) : importer_class.new(paths: [ path ])

        importer.call
        record = factory.to_s.classify.constantize.find_by!(slug: attributes.fetch("slug"))
        expect(record.hidden).to be(false)

        record.update!(hidden: true)
        File.write(path, YAML.safe_dump(resource => [ attributes.merge("hidden" => false) ]))
        importer.call
        expect(record.reload.hidden).to be(true)

        record.update!(hidden: false)
        File.write(path, YAML.safe_dump(resource => [ attributes.merge("hidden" => true) ]))
        importer.call
        expect(record.reload.hidden).to be(false)
      end
    end
  end
end
