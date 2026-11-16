require "rails_helper"

RSpec.describe Parties::Join do
  let(:party) { create(:party) }

  it "creates a pending request for another user's character" do
    character = create(:character)
    join = described_class.new(party: party, character: character, user: character.user)

    expect(join.call).to be(true)
    expect(join.membership).to be_pending
  end

  it "accepts the leader's own character immediately" do
    character = create(:character, user: party.leader)
    join = described_class.new(party: party, character: character, user: party.leader)

    expect(join.call).to be(true)
    expect(join.membership).to be_accepted
  end

  it "rejects a character that already has a membership" do
    membership = create(:party_membership, :pending, party: party)
    join = described_class.new(party: party, character: membership.character, user: membership.character.user)

    expect(join.call).to be(false)
    expect(join.errors).to have_key(:character_id)
  end
end
