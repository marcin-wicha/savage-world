require "rails_helper"
require "tmpdir"
require "fileutils"
require "yaml"

RSpec.describe Skills::Importer do
  around do |example|
    Dir.mktmpdir do |dir|
      @dir = dir
      example.run
    end
  end

  def write_data(filename, skills, book: "SWADE")
    path = File.join(@dir, filename)
    FileUtils.mkdir_p(File.dirname(path))
    File.write(path, YAML.safe_dump({ "book" => book, "skills" => skills }))
    path
  end

  def skill_attributes(overrides = {})
    {
      "name" => "Test Skill",
      "slug" => "test-skill",
      "linked_attribute" => "agility",
      "core" => false,
      "source_book" => "SWADE",
      "source_page" => 29
    }.merge(overrides)
  end

  it "imports skills from a data file" do
    path = write_data("swade.yml", [ skill_attributes ])

    expect { described_class.new(paths: [ path ]).call }.to change(Skill, :count).by(1)

    skill = Skill.find_by!(slug: "test-skill")
    expect(skill.name).to eq("Test Skill")
    expect(skill.linked_attribute).to eq("agility")
    expect(skill).not_to be_core
    expect(skill.source_page).to eq(29)
  end

  it "is idempotent and updates existing skills by slug" do
    path = write_data("swade.yml", [ skill_attributes ])
    importer = described_class.new(paths: [ path ])
    importer.call

    write_data("swade.yml", [ skill_attributes("name" => "Updated Skill") ])

    expect { importer.call }.not_to change(Skill, :count)
    expect(Skill.find_by!(slug: "test-skill").name).to eq("Updated Skill")
  end

  it "uses the document book when a skill omits source_book" do
    path = write_data(
      "fantasy.yml",
      [ skill_attributes("source_book" => nil) ],
      book: "Fantasy Companion"
    )

    described_class.new(paths: [ path ]).call

    expect(Skill.find_by!(slug: "test-skill").source_book).to eq("Fantasy Companion")
  end

  it "loads private files alongside core files" do
    core_path = write_data("swade.yml", [ skill_attributes ])
    write_data(
      "private/fantasy.yml",
      [ skill_attributes("name" => "Fantasy Skill", "slug" => "fantasy-skill", "source_book" => "Fantasy Companion") ]
    )

    expect {
      described_class.new(paths: [ core_path, File.join(@dir, "private/*.yml") ]).call
    }.to change(Skill, :count).by(2)
  end

  it "ignores a missing private glob" do
    path = write_data("swade.yml", [ skill_attributes ])

    expect {
      described_class.new(paths: [ path, File.join(@dir, "private/*.yml") ]).call
    }.to change(Skill, :count).by(1)
  end

  it "rejects duplicate slugs before writing anything" do
    path = write_data("swade.yml", [ skill_attributes, skill_attributes ])

    expect {
      described_class.new(paths: [ path ]).call
    }.to raise_error(described_class::ImportError, /Duplicate skill slugs/)
    expect(Skill.count).to eq(0)
  end

  it "rejects invalid skills before writing anything" do
    path = write_data("swade.yml", [ skill_attributes("linked_attribute" => "luck") ])

    expect {
      described_class.new(paths: [ path ]).call
    }.to raise_error(described_class::ImportError, /Linked attribute is not included in the list/)
    expect(Skill.count).to eq(0)
  end
end
