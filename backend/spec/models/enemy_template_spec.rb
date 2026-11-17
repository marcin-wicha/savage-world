require "rails_helper"

RSpec.describe EnemyTemplate do
  subject(:template) { build(:enemy_template) }

  it { is_expected.to belong_to(:user) }
  it { is_expected.to validate_presence_of(:name) }
  it { is_expected.to validate_length_of(:name).is_at_most(100) }
  it { is_expected.to validate_numericality_of(:size).only_integer.is_greater_than_or_equal_to(-4).is_less_than_or_equal_to(20) }

  it "is valid with a complete stat block" do
    expect(template).to be_valid
  end

  it "accepts dice with modifiers" do
    template.attribute_dice = template.attribute_dice.merge("strength" => "d12+3")
    template.skills = { "fighting" => "d10+1" }

    expect(template).to be_valid
  end

  it "requires all five attributes with valid dice" do
    template.attribute_dice = { "agility" => "d7" }

    expect(template).not_to be_valid
    expect(template.errors[:attribute_dice]).to be_present
  end

  it "rejects invalid skill dice" do
    template.skills = { "fighting" => "huge" }

    expect(template).not_to be_valid
    expect(template.errors[:skills]).to be_present
  end

  it "requires weapons to have a name and damage" do
    template.weapons = [ { "name" => "", "damage" => "lots" } ]

    expect(template).not_to be_valid
    expect(template.errors[:weapons]).to include(
      "weapon 1 must have a name",
      "weapon 1 must have a damage expression such as Str+d6 or 2d6"
    )
  end

  it "rejects malformed weapon ranges" do
    template.weapons = [ { "name" => "Bow", "damage" => "2d6", "range" => "far" } ]

    expect(template).not_to be_valid
    expect(template.errors[:weapons]).to include("weapon 1 range must look like 12/24/48")
  end

  it "accepts known edges and rejects unknown ones" do
    create(:edge, slug: "frenzy")
    template.edge_slugs = [ "frenzy" ]
    expect(template).to be_valid

    template.edge_slugs = [ "frenzy", "laser-eyes" ]
    expect(template).not_to be_valid
    expect(template.errors[:edge_slugs]).to eq([ "contains unknown edges: laser-eyes" ])
  end

  it "rejects unsupported abilities" do
    template.abilities = [ "undead", "teleport" ]

    expect(template).not_to be_valid
    expect(template.errors[:abilities]).to eq([ "contains unsupported abilities: teleport" ])
  end

  it "requires armor to be lower than toughness" do
    template.assign_attributes(toughness: 4, armor: 4)

    expect(template).not_to be_valid
    expect(template.errors[:armor]).to be_present
  end

  it "exposes weapon combat profiles" do
    expect(template.weapon_profiles.first).to have_attributes(name: "Short Sword", attack_skill: "fighting")
  end
end
