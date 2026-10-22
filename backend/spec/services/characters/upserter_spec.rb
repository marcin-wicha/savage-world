require "rails_helper"

RSpec.describe Characters::Upserter do
  let(:user) { create(:user) }
  let(:edge) { create(:edge) }
  let(:hindrance) { create(:hindrance) }
  let(:skill) { create(:skill) }

  it "creates a character with selections" do
    character = user.characters.new

    upserter = described_class.new(
      character: character,
      attributes: {
        name: "Nathan Drake",
        rank: "seasoned",
        edge_ids: [ edge.id ],
        hindrance_ids: [ hindrance.id ],
        skill_ids: [ skill.id ]
      }
    )

    expect(upserter.call).to be(true)
    expect(upserter).to be_created
    expect(upserter.errors).to be_empty
    expect(character).to be_persisted
    expect(character.edges).to contain_exactly(edge)
    expect(character.hindrances).to contain_exactly(hindrance)
    expect(character.skills).to contain_exactly(skill)
  end

  it "updates a character and replaces provided selections" do
    new_edge = create(:edge)
    character = create(:character, user: user, name: "Old Name", rank: "novice")
    character.edges << edge

    upserter = described_class.new(
      character: character,
      attributes: { name: "New Name", rank: "heroic", edge_ids: [ new_edge.id ] }
    )

    expect(upserter.call).to be(true)
    expect(upserter).not_to be_created
    expect(character.reload.name).to eq("New Name")
    expect(character.rank).to eq("heroic")
    expect(character.edges).to contain_exactly(new_edge)
  end

  it "returns reference errors before changing the character" do
    character = create(:character, user: user, name: "Original", rank: "novice")
    character.edges << edge

    upserter = described_class.new(
      character: character,
      attributes: { name: "Changed", rank: "seasoned", edge_ids: [ 0 ] }
    )

    expect(upserter.call).to be(false)
    expect(upserter.errors[:edge_ids]).to eq([ "contains unknown ids: 0" ])

    character.reload
    expect(character.name).to eq("Original")
    expect(character.rank).to eq("novice")
    expect(character.edges).to contain_exactly(edge)
  end

  it "returns model validation errors" do
    character = user.characters.new

    upserter = described_class.new(character: character, attributes: { name: "" })

    expect(upserter.call).to be(false)
    expect(upserter.errors[:name]).to be_present
    expect(character).not_to be_persisted
  end
end
