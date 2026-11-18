require "rails_helper"
require "tmpdir"
require "yaml"

RSpec.describe EnemyTemplates::Importer do
  let(:owner) { create(:user) }

  def entry(name: "Wolf", **overrides)
    {
      "source_key" => "wolf", "name" => name,
      "attribute_dice" => EnemyTemplate::ATTRIBUTES.index_with { "d6" },
      "skills" => { "fighting" => "d6" }, "pace" => 8,
      "parry" => 5, "toughness" => 6, "armor" => 0, "size" => 0,
      "wild_card" => false, "bennies" => 0, "weapons" => [],
      "edge_slugs" => [], "abilities" => []
    }.merge(overrides.stringify_keys)
  end

  around do |example|
    Dir.mktmpdir do |dir|
      @dir = dir
      example.run
    end
  end

  def data(filename, monsters)
    path = File.join(@dir, filename)
    File.write(path, YAML.dump({ "monsters" => monsters }))
    path
  end

  it "imports private data, preferring later Fantasy entries and updating on reseed" do
    core = data("core.yml", [ entry ])
    fantasy = data("fantasy.yml", [ entry(name: "Dire Wolf", toughness: 8) ])
    importer = described_class.new(user: owner, paths: [ core, fantasy ])

    expect { importer.call }.to change(owner.enemy_templates, :count).by(1)
    expect(owner.enemy_templates.first).to have_attributes(name: "Dire Wolf", toughness: 8)

    data("fantasy.yml", [ entry(name: "Dire Wolf", toughness: 9) ])
    expect { importer.call }.not_to change(owner.enemy_templates, :count)
    expect(owner.enemy_templates.first.toughness).to eq(9)
  end

  it "does not overwrite user-created templates with the same name" do
    custom = create(:enemy_template, user: owner, name: "Wolf")
    path = data("core.yml", [ entry ])

    expect { described_class.new(user: owner, paths: [ path ]).call }.to change(owner.enemy_templates, :count).by(1)
    expect(custom.reload.source_key).to be_nil
  end

  it "does not write any templates if one is invalid" do
    path = data("core.yml", [ entry, entry(name: "Invalid", source_key: "invalid", toughness: 0) ])

    expect { described_class.new(user: owner, paths: [ path ]).call }.to raise_error(described_class::ImportError, /invalid/)
    expect(owner.enemy_templates.count).to eq(0)
  end

  it "rejects malformed input and skips absent private files" do
    bad = data("bad.yml", [ { "name" => "Unknown" } ])
    expect { described_class.new(user: owner, paths: [ bad ]).call }.to raise_error(described_class::ImportError, /source_key/)
    expect(described_class.new(user: owner, paths: [ File.join(@dir, "missing.yml") ]).call).to eq(0)
  end
end
