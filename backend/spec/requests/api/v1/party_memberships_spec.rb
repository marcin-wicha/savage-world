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

  describe "POST (leader adds their own character)" do
    def add(character_id, party_id: party.id)
      post "/api/v1/parties/#{party_id}/memberships", params: { character_id: character_id }.to_json, headers: json_headers
    end

    it "adds the leader's character straight to the roster without an invite" do
      character = create(:character, user: leader)
      sign_in_as(leader)

      add(character.id)

      expect(response).to have_http_status(:created)
      expect(json["membership"]).to include("status" => "accepted", "owned_by_me" => true)
      expect(json.dig("membership", "character", "id")).to eq(character.id)
      expect(party.party_memberships.find_by(character: character)).to be_accepted
    end

    it "rejects drafts, dead characters, and characters already in the party" do
      draft = create(:character, :draft, user: leader)
      fallen = create(:character, user: leader, status: :dead)
      member = create(:character, user: leader).tap { |character| create(:party_membership, party: party, character: character) }
      sign_in_as(leader)

      add(draft.id)
      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("details", "character_id")).to eq([ "must be finished before joining a party" ])

      add(fallen.id)
      expect(json.dig("details", "character_id")).to eq([ "cannot join a party while dead" ])

      add(member.id)
      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("details", "character_id")).to eq([ "is already in this party or awaiting approval" ])
    end

    it "forbids adding someone else's character" do
      sign_in_as(leader)

      add(membership.character.id)
      expect(response).to have_http_status(:forbidden)

      add(create(:character).id)
      expect(response).to have_http_status(:forbidden)
    end

    it "forbids members who do not lead the party" do
      character = create(:character, user: participant)
      sign_in_as(participant)

      add(character.id)

      expect(response).to have_http_status(:forbidden)
      expect(party.party_memberships.find_by(character: character)).to be_nil
    end

    it "returns not found for an unknown party or character" do
      sign_in_as(leader)

      add(create(:character, user: leader).id, party_id: 0)
      expect(response).to have_http_status(:not_found)

      add(0)
      expect(response).to have_http_status(:not_found)
    end

    it "requires a character id" do
      sign_in_as(leader)

      post "/api/v1/parties/#{party.id}/memberships", params: {}.to_json, headers: json_headers

      expect(response).to have_http_status(:unprocessable_content)
    end

    it "requires authentication" do
      add(create(:character, user: leader).id)

      expect(response).to have_http_status(:unauthorized)
    end
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
