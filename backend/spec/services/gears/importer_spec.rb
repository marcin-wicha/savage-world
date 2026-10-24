require "rails_helper"
require "tmpdir"
require "fileutils"
require "yaml"

RSpec.describe Gears::Importer do
  around do |example|
    Dir.mktmpdir do |dir|
      @dir = dir
      example.run
    end
  end

  def write_data(filename, gears, book: "Fantasy Companion")
    path = File.join(@dir, filename)
    FileUtils.mkdir_p(File.dirname(path))
    File.write(path, YAML.safe_dump({ "book" => book, "gears" => gears }))
    path
  end

  def gear_attributes(overrides = {})
    {
      "name" => "Healing Kit",
      "slug" => "healing-kit",
      "category" => "general",
      "cost" => 50,
      "cost_text" => "50",
      "requirements" => [],
      "effects" => { "uses" => 5 },
      "source_book" => "Fantasy Companion",
      "source_page" => 47
    }.merge(overrides)
  end

  it "imports gear from a data file" do
    path = write_data("fantasy.yml", [ gear_attributes ])

    expect { described_class.new(paths: [ path ]).call }.to change(Gear, :count).by(1)

    gear = Gear.find_by!(slug: "healing-kit")
    expect(gear.name).to eq("Healing Kit")
    expect(gear.cost).to eq(50)
    expect(gear.effects).to eq("uses" => 5)
  end

  it "is idempotent and updates existing gear by slug" do
    path = write_data("fantasy.yml", [ gear_attributes ])
    importer = described_class.new(paths: [ path ])
    importer.call

    write_data("fantasy.yml", [ gear_attributes("name" => "Updated Healing Kit") ])

    expect { importer.call }.not_to change(Gear, :count)
    expect(Gear.find_by!(slug: "healing-kit").name).to eq("Updated Healing Kit")
  end

  it "loads private files alongside the core path" do
    core_path = write_data("fantasy.yml", [ gear_attributes ])
    private_path = write_data(
      "private/extra.yml",
      [ gear_attributes("name" => "Private Gear", "slug" => "private-gear") ]
    )

    expect {
      described_class.new(paths: [ core_path, private_path ]).call
    }.to change(Gear, :count).by(2)
  end

  it "returns zero when no data files are available" do
    expect(described_class.new(paths: [ File.join(@dir, "missing.yml") ]).call).to eq(0)
  end

  it "rejects duplicate slugs before writing anything" do
    path = write_data("fantasy.yml", [ gear_attributes, gear_attributes ])

    expect {
      described_class.new(paths: [ path ]).call
    }.to raise_error(described_class::ImportError, /Duplicate gear slugs/)
    expect(Gear.count).to eq(0)
  end

  it "rejects invalid gear before writing anything" do
    path = write_data("fantasy.yml", [ gear_attributes("category" => "invalid") ])

    expect {
      described_class.new(paths: [ path ]).call
    }.to raise_error(described_class::ImportError, /Category is not included in the list/)
    expect(Gear.count).to eq(0)
  end
end
