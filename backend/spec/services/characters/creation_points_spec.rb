require "rails_helper"

RSpec.describe Characters::CreationPoints do
  let(:character) { create(:character, :draft) }

  it "earns points from hindrances using the chosen severity" do
    create(:character_hindrance, character: character, hindrance: create(:hindrance, severity: "major"))
    create(:character_hindrance, character: character, hindrance: create(:hindrance, severity: "minor_or_major"), severity: "major")
    create(:character_hindrance, character: character, hindrance: create(:hindrance, severity: "minor_or_major"))

    expect(described_class.new(character).earned).to eq(5)
    expect(described_class.new(character).errors).to eq(hindrance_points_earned: [ "cannot exceed 4" ])
  end

  it "charges attribute steps and skill points beyond the free allowance, and two points per edge" do
    character.update!(attribute_dice: { "agility" => "d12", "smarts" => "d8", "spirit" => "d4", "strength" => "d4", "vigor" => "d4" })
    create(:character_skill, character: character, skill: create(:skill, core: true), die: "d12")
    create(:character_skill, character: character, skill: create(:skill, core: false), die: "d12")
    create(:character_skill, character: character, skill: create(:skill, core: false), die: "d10")
    create(:character_edge, character: character, edge: create(:edge))

    expect(described_class.new(character).spent).to eq(attributes: 1, skills: 1, edges: 2)
  end

  it "is balanced when every earned point is spent" do
    create(:character_hindrance, character: character, hindrance: create(:hindrance, severity: "major"))
    create(:character_edge, character: character, edge: create(:edge))

    expect(described_class.new(character).errors).to be_empty
  end
end
