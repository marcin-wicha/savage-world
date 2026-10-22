require "rails_helper"
require "tmpdir"
require "fileutils"
require "yaml"

RSpec.describe Edges::Importer do
  around do |example|
    Dir.mktmpdir do |dir|
      @dir = dir
      example.run
    end
  end

  def write_data(filename, edges, book: "SWADE")
    path = File.join(@dir, filename)
    FileUtils.mkdir_p(File.dirname(path))
    File.write(path, YAML.safe_dump({ "book" => book, "edges" => edges }))
    path
  end

  def edge_attributes(overrides = {})
    {
      "name" => "Test Edge",
      "slug" => "test-edge",
      "category" => "combat",
      "minimum_rank" => "novice",
      "requirements" => [],
      "source_book" => "SWADE",
      "source_page" => 10,
      "repeatable" => false
    }.merge(overrides)
  end

  it "imports edges from a data file" do
    path = write_data("swade.yml", [ edge_attributes ])

    expect { described_class.new(paths: [ path ]).call }.to change(Edge, :count).by(1)

    edge = Edge.find_by!(slug: "test-edge")
    expect(edge.name).to eq("Test Edge")
    expect(edge.category).to eq("combat")
    expect(edge.minimum_rank).to eq("novice")
    expect(edge.source_page).to eq(10)
  end

  it "is idempotent and updates existing edges by slug" do
    path = write_data("swade.yml", [ edge_attributes ])
    importer = described_class.new(paths: [ path ])
    importer.call

    write_data("swade.yml", [ edge_attributes("name" => "Updated Edge") ])

    expect { importer.call }.not_to change(Edge, :count)
    expect(Edge.find_by!(slug: "test-edge").name).to eq("Updated Edge")
  end

  it "uses the document book when an edge omits source_book" do
    path = write_data(
      "fantasy.yml",
      [ edge_attributes("source_book" => nil) ],
      book: "Fantasy Companion"
    )

    described_class.new(paths: [ path ]).call

    expect(Edge.find_by!(slug: "test-edge").source_book).to eq("Fantasy Companion")
  end

  it "loads private files alongside core files" do
    core_path = write_data("swade.yml", [ edge_attributes ])
    write_data(
      "private/fantasy.yml",
      [ edge_attributes("name" => "Fantasy Edge", "slug" => "fantasy-edge", "source_book" => "Fantasy Companion") ]
    )

    expect {
      described_class.new(paths: [ core_path, File.join(@dir, "private/*.yml") ]).call
    }.to change(Edge, :count).by(2)
  end

  it "ignores a missing private glob" do
    path = write_data("swade.yml", [ edge_attributes ])

    expect {
      described_class.new(paths: [ path, File.join(@dir, "private/*.yml") ]).call
    }.to change(Edge, :count).by(1)
  end

  it "stores the referenced edge name in edge requirements" do
    path = write_data(
      "swade.yml",
      [
        edge_attributes("name" => "Hard to Kill", "slug" => "hard-to-kill"),
        edge_attributes(
          "name" => "Harder to Kill",
          "slug" => "harder-to-kill",
          "requirements" => [ { "kind" => "edge", "slug" => "hard-to-kill" } ]
        )
      ]
    )

    described_class.new(paths: [ path ]).call

    requirement = Edge.find_by!(slug: "harder-to-kill").requirements.first
    expect(requirement).to eq(
      "kind" => "edge",
      "slug" => "hard-to-kill",
      "name" => "Hard to Kill"
    )
  end

  it "rejects duplicate slugs before writing anything" do
    path = write_data("swade.yml", [ edge_attributes, edge_attributes ])

    expect {
      described_class.new(paths: [ path ]).call
    }.to raise_error(described_class::ImportError, /Duplicate edge slugs/)
    expect(Edge.count).to eq(0)
  end

  it "rejects unknown edge requirements before writing anything" do
    path = write_data(
      "swade.yml",
      [ edge_attributes("requirements" => [ { "kind" => "edge", "slug" => "missing" } ]) ]
    )

    expect {
      described_class.new(paths: [ path ]).call
    }.to raise_error(described_class::ImportError, /Unknown edge requirements: missing/)
    expect(Edge.count).to eq(0)
  end

  it "rejects invalid edges before writing anything" do
    path = write_data("swade.yml", [ edge_attributes("category" => "invalid") ])

    expect {
      described_class.new(paths: [ path ]).call
    }.to raise_error(described_class::ImportError, /Category is not included in the list/)
    expect(Edge.count).to eq(0)
  end
end
