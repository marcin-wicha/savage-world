require "rails_helper"

RSpec.describe "Party memberships", type: :request do
  let(:leader) { create(:user) }
  let(:participant) { create(:user) }
  let(:requester) { create(:user) }
  let(:party) { create(:party, leader: leader) }
  let!(:membership) { create(:party_membership, party: party, character: create(:character, user: participant)) }
  let!(:pending_membership) do
    create(:party_membership, :pending, party: party, character: create(:character, user: requester))
  end

  def accept(target, party_id: party.id)
    patch "/api/v1/parties/#{party_id}/memberships/#{target.id}/accept", headers: json_headers
  end

  def remove(target)
    delete "/api/v1/parties/#{party.id}/memberships/#{target.id}", headers: json_headers
  end

  describe "PATCH accept" do
    it "lets the leader accept a pending request" do
      sign_in_as(leader)

      accept(pending_membership)

      expect(response).to have_http_status(:ok)
      expect(pending_membership.reload).to be_accepted
    end

    it "forbids participants and requesters" do
      [ participant, requester ].each do |user|
        sign_in_as(user)

        accept(pending_membership)

        expect(response).to have_http_status(:forbidden)
      end
      expect(pending_membership.reload).to be_pending
    end

    it "returns not found when the membership belongs to another party" do
      sign_in_as(leader)

      accept(pending_membership, party_id: create(:party, leader: leader).id)

      expect(response).to have_http_status(:not_found)
    end

    it "requires authentication" do
      accept(pending_membership)

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "DELETE" do
    it "lets the leader reject a request or remove a member" do
      sign_in_as(leader)

      remove(pending_membership)
      expect(response).to have_http_status(:no_content)

      remove(membership)
      expect(response).to have_http_status(:no_content)
      expect(party.party_memberships).to be_empty
    end

    it "lets a participant leave with their own character" do
      sign_in_as(participant)

      remove(membership)

      expect(response).to have_http_status(:no_content)
      expect(PartyMembership.exists?(membership.id)).to be(false)
    end

    it "lets a requester cancel their own request" do
      sign_in_as(requester)

      remove(pending_membership)

      expect(response).to have_http_status(:no_content)
    end

    it "forbids participants from removing other characters" do
      sign_in_as(participant)

      remove(pending_membership)

      expect(response).to have_http_status(:forbidden)
      expect(PartyMembership.exists?(pending_membership.id)).to be(true)
    end
  end
end
