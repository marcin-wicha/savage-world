require "rails_helper"
require "yaml"

RSpec.describe "SWADE skill seed data" do
  let(:path) { Rails.root.join("db/data/skills/swade.yml") }
  let(:document) { YAML.safe_load_file(path, permitted_classes: [], aliases: false) }
  let(:skills) { document.fetch("skills") }

  def find_skill(slug)
    skills.find { |skill| skill["slug"] == slug }
  end

  it "contains 32 unique skills" do
    expect(skills.size).to eq(32)
    expect(skills.map { |skill| skill["slug"] }.uniq.size).to eq(32)
  end

  it "contains only valid skills" do
    skills.each do |attributes|
      skill = Skill.new(attributes)
      expect(skill).to be_valid, "#{attributes['name']}: #{skill.errors.full_messages.to_sentence}"
    end
  end

  it "preserves the attribute counts" do
    expect(skills.map { |skill| skill["linked_attribute"] }.tally).to eq(
      "agility" => 9,
      "smarts" => 18,
      "spirit" => 5
    )
  end

  it "marks the five core skills" do
    core_slugs = skills.select { |skill| skill["core"] }.map { |skill| skill["slug"] }

    expect(core_slugs).to contain_exactly(
      "athletics",
      "common-knowledge",
      "notice",
      "persuasion",
      "stealth"
    )
  end

  it "does not include the unskilled attempt pseudo-skill" do
    expect(find_skill("unskilled-attempt")).to be_nil
  end

  it "does not commit rulebook prose" do
    expect(skills.flat_map(&:keys)).not_to include("description", "summary")
  end
end
