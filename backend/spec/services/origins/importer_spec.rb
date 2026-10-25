require "rails_helper"
require "tmpdir"
require "yaml"

RSpec.describe Origins::Importer do
  around do |example|
    Dir.mktmpdir do |dir|
      @path = File.join(dir, "origins.yml")
      example.run
    end
  end

  def write_data(origins)
    File.write(@path, YAML.safe_dump("origins" => origins))
    @path
  end

  def origin_attributes(overrides = {})
    {
      "name" => "Test Origin",
      "slug" => "test-origin",
      "description" => "A test origin."
    }.merge(overrides)
  end

  it "imports origins from a data file" do
    path = write_data([ origin_attributes ])

    expect { described_class.new(path: path).call }.to change(Origin, :count).by(1)

    origin = Origin.find_by!(slug: "test-origin")
    expect(origin.name).to eq("Test Origin")
    expect(origin.description).to eq("A test origin.")
  end

  it "is idempotent and updates existing origins by slug" do
    path = write_data([ origin_attributes ])
    importer = described_class.new(path: path)
    importer.call

    write_data([ origin_attributes("name" => "Updated Origin", "description" => "Updated.") ])

    expect { importer.call }.not_to change(Origin, :count)
    expect(Origin.find_by!(slug: "test-origin").name).to eq("Updated Origin")
    expect(Origin.find_by!(slug: "test-origin").description).to eq("Updated.")
  end

  it "rejects duplicate slugs before writing anything" do
    path = write_data([ origin_attributes, origin_attributes ])

    expect {
      described_class.new(path: path).call
    }.to raise_error(described_class::ImportError, /Duplicate origin slugs/)
    expect(Origin.count).to eq(0)
  end

  it "rejects incomplete records before writing anything" do
    path = write_data([ origin_attributes("description" => nil) ])

    expect {
      described_class.new(path: path).call
    }.to raise_error(described_class::ImportError, /missing: description/)
    expect(Origin.count).to eq(0)
  end
end
