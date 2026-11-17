require "rails_helper"

RSpec.describe "Parties", type: :request do
  let(:leader) { create(:user) }
  let(:participant) { create(:user) }
  let(:requester) { create(:user) }
  let(:party) { create(:party, leader: leader, name: "The Crew", description: "Treasure hunters") }
  let(:origin) { create(:origin, name: "Dunestriders") }
  let!(:member_character) do
    create(:character, user: participant, name: "Katarina", rank: "seasoned", origin: origin)
  end
  let!(:membership) { create(:party_membership, party: party, character: member_character) }
  let!(:pending_membership) do
    create(:party_membership, :pending, party: party, character: create(:character, user: requester, name: "Rook"))
  end

  def patch_party(attributes)
    patch "/api/v1/parties/#{party.id}", params: { party: attributes }.to_json, headers: json_headers
  end

  describe "GET /api/v1/parties" do
    it "lists led parties and parties with the user's characters" do
      create(:party, name: "Someone else's")
      sign_in_as(participant)

      get "/api/v1/parties", headers: json_headers

      expect(response).to have_http_status(:ok)
      expect(json["parties"]).to contain_exactly(
        hash_including("id" => party.id, "name" => "The Crew", "led_by_me" => false, "my_status" => "accepted", "member_count" => 1)
      )
    end

    it "includes accepted member names and avatars" do
      member_character.update!(avatar_filename: "a" * 32)
      sign_in_as(leader)

      get "/api/v1/parties", headers: json_headers

      expect(json.dig("parties", 0, "member_characters")).to eq([
        {
          "id" => member_character.id,
          "name" => "Katarina",
          "avatar_url" => "/api/v1/characters/#{member_character.id}/avatar/#{'a' * 32}"
        }
      ])
    end

    it "shows pending requests with their status but not the roster" do
      sign_in_as(requester)

      get "/api/v1/parties", headers: json_headers

      expect(json["parties"]).to contain_exactly(
        hash_including("id" => party.id, "my_status" => "pending", "member_characters" => [])
      )
    end

    it "requires authentication" do
      get "/api/v1/parties", headers: json_headers

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "POST /api/v1/parties" do
    it "creates a party led by the current user" do
      sign_in_as(participant)

      post "/api/v1/parties",
        params: { party: { name: " New Party ", description: "Heist" } }.to_json,
        headers: json_headers

      expect(response).to have_http_status(:created)
      created = Party.find(json.dig("party", "id"))
      expect(created.leader).to eq(participant)
      expect(json["party"]).to include("name" => "New Party", "led_by_me" => true, "invite_code" => created.invite_code, "members" => [])
    end

    it "rejects a blank name" do
      sign_in_as(participant)

      post "/api/v1/parties", params: { party: { name: "" } }.to_json, headers: json_headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("details", "name")).to be_present
    end

    it "requires authentication" do
      post "/api/v1/parties", params: { party: { name: "X" } }.to_json, headers: json_headers

      expect(response).to have_http_status(:unauthorized)
      expect(Party.where(name: "X")).to be_empty
    end
  end

  describe "GET /api/v1/parties/:id" do
    it "shows the leader the invite code and pending requests" do
      sign_in_as(leader)

      get "/api/v1/parties/#{party.id}", headers: json_headers

      expect(response).to have_http_status(:ok)
      expect(json["party"]).to include("invite_code" => party.invite_code, "led_by_me" => true)
      expect(json.dig("party", "members").map { |member| member["status"] }).to eq(%w[accepted pending])
    end

    it "shows participants the accepted roster without emails or the invite code" do
      sign_in_as(participant)

      get "/api/v1/parties/#{party.id}", headers: json_headers

      expect(response).to have_http_status(:ok)
      expect(json["party"]).not_to have_key("invite_code")
      expect(json.dig("party", "members")).to contain_exactly(
        hash_including(
          "membership_id" => membership.id,
          "status" => "accepted",
          "owned_by_me" => true,
          "character" => {
            "id" => member_character.id, "name" => "Katarina", "avatar_url" => nil,
            "rank" => "seasoned", "origin_name" => "Dunestriders"
          }
        )
      )
      expect(response.body).not_to include(participant.email_address)
      expect(response.body).not_to include(leader.email_address)
    end

    it "forbids users with only a pending request" do
      sign_in_as(requester)

      get "/api/v1/parties/#{party.id}", headers: json_headers

      expect(response).to have_http_status(:forbidden)
    end

    it "forbids unrelated users" do
      sign_in_as(create(:user))

      get "/api/v1/parties/#{party.id}", headers: json_headers

      expect(response).to have_http_status(:forbidden)
    end

    it "returns not found for a missing party" do
      sign_in_as(leader)

      get "/api/v1/parties/0", headers: json_headers

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "PATCH /api/v1/parties/:id" do
    it "lets the leader rename the party" do
      sign_in_as(leader)

      patch_party(name: "Renamed", description: "New text")

      expect(response).to have_http_status(:ok)
      expect(party.reload).to have_attributes(name: "Renamed", description: "New text")
    end

    it "transfers leadership to the owner of an accepted character" do
      sign_in_as(leader)

      patch_party(leader_id: participant.id)

      expect(response).to have_http_status(:ok)
      expect(party.reload.leader).to eq(participant)
      expect(json["party"]).to include("led_by_me" => false)
      expect(json["party"]).not_to have_key("invite_code")
    end

    it "rejects transfer to a pending requester" do
      sign_in_as(leader)

      patch_party(leader_id: requester.id)

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("details", "leader_id")).to be_present
      expect(party.reload.leader).to eq(leader)
    end

    it "rejects invalid attributes" do
      sign_in_as(leader)

      patch_party(name: "")

      expect(response).to have_http_status(:unprocessable_content)
      expect(party.reload.name).to eq("The Crew")
    end

    it "forbids participants" do
      sign_in_as(participant)

      patch_party(name: "Mine now", leader_id: participant.id)

      expect(response).to have_http_status(:forbidden)
      expect(party.reload).to have_attributes(name: "The Crew", leader_id: leader.id)
    end
  end

  describe "DELETE /api/v1/parties/:id" do
    it "lets the leader disband the party" do
      sign_in_as(leader)

      delete "/api/v1/parties/#{party.id}", headers: json_headers

      expect(response).to have_http_status(:no_content)
      expect(Party.exists?(party.id)).to be(false)
      expect(PartyMembership.where(party_id: party.id)).to be_empty
      expect(Character.exists?(member_character.id)).to be(true)
    end

    it "forbids participants" do
      sign_in_as(participant)

      delete "/api/v1/parties/#{party.id}", headers: json_headers

      expect(response).to have_http_status(:forbidden)
      expect(Party.exists?(party.id)).to be(true)
    end
  end

  describe "POST /api/v1/parties/:id/invite_code" do
    it "lets the leader regenerate the invite code" do
      sign_in_as(leader)
      original = party.invite_code

      post "/api/v1/parties/#{party.id}/invite_code", headers: json_headers

      expect(response).to have_http_status(:ok)
      expect(party.reload.invite_code).not_to eq(original)
      expect(json.dig("party", "invite_code")).to eq(party.invite_code)
    end

    it "forbids participants" do
      sign_in_as(participant)

      post "/api/v1/parties/#{party.id}/invite_code", headers: json_headers

      expect(response).to have_http_status(:forbidden)
    end
  end
end
