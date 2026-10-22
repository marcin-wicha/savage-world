require "rails_helper"
require "tmpdir"
require "fileutils"
require "yaml"

RSpec.describe Hindrances::Importer do
  around do |example|
    Dir.mktmpdir do |dir|
      @dir = dir
      example.run
    end
  end

  def write_data(filename, hindrances, book: "SWADE")
    path = File.join(@dir, filename)
    FileUtils.mkdir_p(File.dirname(path))
    File.write(path, YAML.safe_dump({ "book" => book, "hindrances" => hindrances }))
    path
  end

  def hindrance_attributes(overrides = {})
    {
      "name" => "Test Hindrance",
      "slug" => "test-hindrance",
      "severity" => "minor",
      "requirements" => [],
      "source_book" => "SWADE",
      "source_page" => 22
    }.merge(overrides)
  end

  it "imports hindrances from a data file" do
    path = write_data("swade.yml", [ hindrance_attributes ])

    expect { described_class.new(paths: [ path ]).call }.to change(Hindrance, :count).by(1)

    hindrance = Hindrance.find_by!(slug: "test-hindrance")
    expect(hindrance.name).to eq("Test Hindrance")
    expect(hindrance.severity).to eq("minor")
    expect(hindrance.source_page).to eq(22)
  end

  it "is idempotent and updates existing hindrances by slug" do
    path = write_data("swade.yml", [ hindrance_attributes ])
    importer = described_class.new(paths: [ path ])
    importer.call

    write_data("swade.yml", [ hindrance_attributes("name" => "Updated Hindrance") ])

    expect { importer.call }.not_to change(Hindrance, :count)
    expect(Hindrance.find_by!(slug: "test-hindrance").name).to eq("Updated Hindrance")
  end

  it "uses the document book when a hindrance omits source_book" do
    path = write_data(
      "fantasy.yml",
      [ hindrance_attributes("source_book" => nil) ],
      book: "Fantasy Companion"
    )

    described_class.new(paths: [ path ]).call

    expect(Hindrance.find_by!(slug: "test-hindrance").source_book).to eq("Fantasy Companion")
  end

  it "loads private files alongside core files" do
    core_path = write_data("swade.yml", [ hindrance_attributes ])
    write_data(
      "private/fantasy.yml",
      [ hindrance_attributes("name" => "Fantasy Hindrance", "slug" => "fantasy-hindrance", "source_book" => "Fantasy Companion") ]
    )

    expect {
      described_class.new(paths: [ core_path, File.join(@dir, "private/*.yml") ]).call
    }.to change(Hindrance, :count).by(2)
  end

  it "ignores a missing private glob" do
    path = write_data("swade.yml", [ hindrance_attributes ])

    expect {
      described_class.new(paths: [ path, File.join(@dir, "private/*.yml") ]).call
    }.to change(Hindrance, :count).by(1)
  end

  it "rejects duplicate slugs before writing anything" do
    path = write_data("swade.yml", [ hindrance_attributes, hindrance_attributes ])

    expect {
      described_class.new(paths: [ path ]).call
    }.to raise_error(described_class::ImportError, /Duplicate hindrance slugs/)
    expect(Hindrance.count).to eq(0)
  end

  it "rejects invalid hindrances before writing anything" do
    path = write_data("swade.yml", [ hindrance_attributes("severity" => "unknown") ])

    expect {
      described_class.new(paths: [ path ]).call
    }.to raise_error(described_class::ImportError, /Severity is not included in the list/)
    expect(Hindrance.count).to eq(0)
  end
end
