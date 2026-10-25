require "rails_helper"

RSpec.describe Characters::Upserter do
  let(:user) { create(:user) }
  let(:edge) { create(:edge) }
  let(:hindrance) { create(:hindrance) }
  let(:skill) { create(:skill) }
  let(:origin) { create(:origin) }

  it "creates a character with selections" do
    character = user.characters.new

    upserter = described_class.new(
      character: character,
      attributes: {
        name: "Nathan Drake",
        rank: "seasoned",
        origin_id: origin.id,
        edge_ids: [ edge.id ],
        hindrance_ids: [ hindrance.id ],
        skill_ids: [ skill.id ]
      }
    )

    expect(upserter.call).to be(true)
    expect(upserter).to be_created
    expect(upserter.errors).to be_empty
    expect(character).to be_persisted
    expect(character.origin).to eq(origin)
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

  it "updates and clears an existing origin when requested" do
    character = create(:character, user: user, origin: origin)
    replacement = create(:origin)

    expect(described_class.new(character: character, attributes: { origin_id: replacement.id }).call).to be(true)
    expect(character.reload.origin).to eq(replacement)

    expect(described_class.new(character: character, attributes: { origin_id: nil }).call).to be(true)
    expect(character.reload.origin).to be_nil
  end

  it "leaves an omitted origin unchanged" do
    character = create(:character, user: user, origin: origin)

    expect(described_class.new(character: character, attributes: { name: "Updated" }).call).to be(true)
    expect(character.reload.origin).to eq(origin)
  end

  it "returns origin reference errors before changing the character" do
    character = create(:character, user: user, origin: origin, name: "Original")

    upserter = described_class.new(
      character: character,
      attributes: { name: "Changed", origin_id: "not-an-id" }
    )

    expect(upserter.call).to be(false)
    expect(upserter.errors[:origin_id]).to eq([ "must be an integer id or null" ])
    expect(character.reload.name).to eq("Original")
    expect(character.origin).to eq(origin)
  end

  it "rejects unknown origin ids before changing the character" do
    character = create(:character, user: user, origin: origin, name: "Original")

    upserter = described_class.new(
      character: character,
      attributes: { name: "Changed", origin_id: 0 }
    )

    expect(upserter.call).to be(false)
    expect(upserter.errors[:origin_id]).to eq([ "contains unknown id: 0" ])
    expect(character.reload.name).to eq("Original")
    expect(character.origin).to eq(origin)
  end

  it "rejects unspent hindrance points" do
    character = user.characters.new

    upserter = described_class.new(
      character: character,
      attributes: {
        name: "Nathan Drake",
        hindrance_ids: [ hindrance.id ],
        hindrance_points_earned: 1,
        hindrance_points_spent: 0
      }
    )

    expect(upserter.call).to be(false)
    expect(upserter.errors[:hindrance_points_spent]).to eq(
      [ "must spend all earned hindrance points before saving" ]
    )
    expect(character).not_to be_persisted
  end

  it "accepts a minor-or-major hindrance when all earned points are spent" do
    flexible_hindrance = create(:hindrance, severity: :minor_or_major)
    character = user.characters.new

    upserter = described_class.new(
      character: character,
      attributes: {
        name: "Nathan Drake",
        hindrance_ids: [ flexible_hindrance.id ],
        hindrance_severities: { flexible_hindrance.id.to_s => "major" },
        hindrance_points_earned: 2,
        hindrance_points_spent: 2
      }
    )

    expect(upserter.call).to be(true)
    expect(character.hindrances).to contain_exactly(flexible_hindrance)
  end

  it "defaults a minor-or-major hindrance to minor when no severity is supplied" do
    flexible_hindrance = create(:hindrance, severity: :minor_or_major)
    character = user.characters.new

    upserter = described_class.new(
      character: character,
      attributes: {
        name: "Nathan Drake",
        hindrance_ids: [ flexible_hindrance.id ],
        hindrance_points_earned: 1,
        hindrance_points_spent: 1
      }
    )

    expect(upserter.call).to be(true)
    expect(upserter.errors).to be_empty
  end

  it "returns model validation errors" do
    character = user.characters.new

    upserter = described_class.new(character: character, attributes: { name: "" })

    expect(upserter.call).to be(false)
    expect(upserter.errors[:name]).to be_present
    expect(character).not_to be_persisted
  end
end
