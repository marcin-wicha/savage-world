require "rails_helper"

RSpec.describe "Party invites", type: :request do
  let(:leader) { create(:user) }
  let(:user) { create(:user) }
  let(:party) { create(:party, leader: leader, name: "The Crew") }
  let(:character) { create(:character, user: user) }

  def join(code, character_id)
    post "/api/v1/party_invites/#{code}/memberships",
      params: { character_id: character_id }.to_json,
      headers: json_headers
  end

  describe "GET /api/v1/party_invites/:code" do
    it "previews the party and the user's existing memberships" do
      create(:party_membership, :pending, party: party, character: character)
      create(:party_membership, party: party)
      sign_in_as(user)

      get "/api/v1/party_invites/#{party.invite_code}", headers: json_headers

      expect(response).to have_http_status(:ok)
      expect(json["party"]).to include("id" => party.id, "name" => "The Crew", "member_count" => 1, "led_by_me" => false)
      expect(json["my_memberships"]).to eq([ { "character_id" => character.id, "status" => "pending" } ])
    end

    it "returns not found for an unknown code" do
      sign_in_as(user)

      get "/api/v1/party_invites/nope", headers: json_headers

      expect(response).to have_http_status(:not_found)
    end

    it "requires authentication" do
      get "/api/v1/party_invites/#{party.invite_code}", headers: json_headers

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "POST /api/v1/party_invites/:code/memberships" do
    it "creates a pending join request" do
      sign_in_as(user)

      join(party.invite_code, character.id)

      expect(response).to have_http_status(:created)
      expect(json["membership"]).to include("status" => "pending", "owned_by_me" => true)
      expect(party.party_memberships.find_by(character: character)).to be_pending
    end

    it "accepts the leader's own character immediately" do
      own = create(:character, user: leader)
      sign_in_as(leader)

      join(party.invite_code, own.id)

      expect(response).to have_http_status(:created)
      expect(json.dig("membership", "status")).to eq("accepted")
    end

    it "lets a character join several parties" do
      create(:party_membership, character: character)
      sign_in_as(user)

      join(party.invite_code, character.id)

      expect(response).to have_http_status(:created)
      expect(character.party_memberships.count).to eq(2)
    end

    it "rejects a duplicate request" do
      create(:party_membership, :pending, party: party, character: character)
      sign_in_as(user)

      join(party.invite_code, character.id)

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("details", "character_id")).to be_present
    end

    it "forbids joining with another user's character" do
      sign_in_as(create(:user))

      join(party.invite_code, character.id)

      expect(response).to have_http_status(:forbidden)
      expect(PartyMembership.count).to eq(0)
    end

    it "returns not found for an unknown code or character" do
      sign_in_as(user)

      join("nope", character.id)
      expect(response).to have_http_status(:not_found)

      join(party.invite_code, 0)
      expect(response).to have_http_status(:not_found)
    end

    it "requires a character id" do
      sign_in_as(user)

      post "/api/v1/party_invites/#{party.invite_code}/memberships", params: {}.to_json, headers: json_headers

      expect(response).to have_http_status(:unprocessable_content)
    end
  end
end
