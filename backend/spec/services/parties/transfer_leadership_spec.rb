require "rails_helper"

RSpec.describe Parties::TransferLeadership do
  let(:party) { create(:party) }
  let(:member) { create(:user) }
  let(:requester) { create(:user) }

  before do
    create(:party_membership, party: party, character: create(:character, user: member))
    create(:party_membership, :pending, party: party, character: create(:character, user: requester))
  end

  it "assigns the owner of an accepted character as leader" do
    transfer = described_class.new(party: party, new_leader_id: member.id.to_s)

    expect(transfer.call).to be(true)
    expect(party.leader_id).to eq(member.id)
  end

  it "rejects owners of pending characters" do
    transfer = described_class.new(party: party, new_leader_id: requester.id)

    expect(transfer.call).to be(false)
    expect(transfer.errors[:leader_id]).to include("must own an accepted character in the party")
  end

  it "rejects unrelated users and invalid ids" do
    expect(described_class.new(party: party, new_leader_id: create(:user).id).call).to be(false)
    expect(described_class.new(party: party, new_leader_id: "abc").call).to be(false)
  end

  it "rejects the current leader" do
    transfer = described_class.new(party: party, new_leader_id: party.leader_id)

    expect(transfer.call).to be(false)
    expect(transfer.errors[:leader_id]).to include("is already the party leader")
  end
end
