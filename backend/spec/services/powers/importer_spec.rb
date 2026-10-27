require "rails_helper"
require "tmpdir"
require "yaml"

RSpec.describe Powers::Importer do
  around do |example|
    Dir.mktmpdir do |dir|
      @dir = dir
      example.run
    end
  end

  def write_data(entries)
    path = File.join(@dir, "powers.yml")
    File.write(path, YAML.safe_dump({ "book" => "Fantasy Companion", "page" => 146, "powers" => entries }))
    path
  end

  def attributes(overrides = {})
    {
      "name" => "Arcane Bolt",
      "rank" => "novice",
      "power_points" => "2",
      "duration" => "Instant",
      "range" => "Smarts",
      "summary" => "A brief original summary."
    }.merge(overrides)
  end

  it "imports and updates power records by slug" do
    path = write_data([ attributes ])
    importer = described_class.new(paths: [ path ])
    expect { importer.call }.to change(Power, :count).by(1)
    expect(Power.find_by!(slug: "arcane-bolt")).to have_attributes(rank: "novice", source_page: 146)

    write_data([ attributes("summary" => "Updated summary.") ])
    expect { importer.call }.not_to change(Power, :count)
    expect(Power.find_by!(slug: "arcane-bolt").summary).to eq("Updated summary.")
  end

  it "rejects duplicate slugs before writing" do
    path = write_data([ attributes, attributes ])
    expect { described_class.new(paths: [ path ]).call }
      .to raise_error(described_class::ImportError, /Duplicate power slugs/)
    expect(Power.count).to eq(0)
  end
end
