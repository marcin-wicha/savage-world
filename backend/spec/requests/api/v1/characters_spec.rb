require "rails_helper"

RSpec.describe "Characters", type: :request do
  let(:user) { create(:user, password: "password123") }
  let(:edge) { create(:edge) }
  let(:hindrance) { create(:hindrance) }
  let(:skill) { create(:skill) }
  let(:origin) { create(:origin) }
  let(:character_id) { 12_345 }

  before { sign_in(user) }

  def sign_in(user)
    get "/api/v1/session", headers: json_headers
    token = response.cookies["XSRF-TOKEN"]

    post "/api/v1/session",
      params: { email_address: user.email_address, password: "password123" }.to_json,
      headers: json_headers(csrf_token: token)

    expect(response).to have_http_status(:created)
  end

  def put_character(id, attributes)
    put "/api/v1/characters/#{id}",
      params: { character: attributes }.to_json,
      headers: json_headers
  end

  describe "GET /api/v1/characters" do
    it "lists only the current user's characters" do
      character = create(
        :character,
        user: user,
        name: "Katarina Voss",
        rank: "seasoned",
        origin: origin
      )
      create(:character, name: "Someone Else")

      get "/api/v1/characters", headers: json_headers

      expect(response).to have_http_status(:ok)
      expect(json["characters"]).to contain_exactly(
        hash_including(
          "id" => character.id,
          "name" => "Katarina Voss",
          "rank" => "seasoned",
          "origin_id" => origin.id,
          "origin_name" => origin.name,
          "edge_ids" => [],
          "hindrance_ids" => [],
          "skill_ids" => []
        )
      )
    end

    it "requires authentication" do
      delete "/api/v1/session", headers: json_headers

      get "/api/v1/characters", headers: json_headers

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "GET /api/v1/characters/:id" do
    it "returns the current user's character" do
      character = create(:character, user: user, name: "Katarina Voss", origin: origin)
      character.edges << edge

      get "/api/v1/characters/#{character.id}", headers: json_headers

      expect(response).to have_http_status(:ok)
      expect(json).to eq(
        "character" => {
          "id" => character.id,
          "name" => "Katarina Voss",
          "rank" => "novice",
          "origin_id" => origin.id,
          "origin_name" => origin.name,
          "edge_ids" => [ edge.id ],
          "hindrance_ids" => [],
          "skill_ids" => []
        }
      )
    end

    it "does not expose another user's character" do
      character = create(:character)

      get "/api/v1/characters/#{character.id}", headers: json_headers

      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "POST /api/v1/characters" do
    it "creates a character without requiring a client-generated id" do
      expect {
        post "/api/v1/characters",
          params: {
            character: {
              name: "Nathan Drake",
              rank: "novice",
              origin_id: origin.id,
              edge_ids: [ edge.id ],
              hindrance_ids: [ hindrance.id ],
              skill_ids: [ skill.id ],
              hindrance_points_earned: 1,
              hindrance_points_spent: 1
            }
          }.to_json,
          headers: json_headers
      }.to change(user.characters, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(json.dig("character", "id")).to be_present
      expect(json.dig("character", "name")).to eq("Nathan Drake")
    end

    it "requires hindrance point totals when creating a character" do
      post "/api/v1/characters",
        params: { character: { name: "Nathan Drake", hindrance_ids: [ hindrance.id ] } }.to_json,
        headers: json_headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("details", "hindrance_points")).to eq(
        [ "must include earned and spent hindrance points" ]
      )
      expect(user.characters).to be_empty
    end

    it "requires authentication" do
      delete "/api/v1/session", headers: json_headers

      post "/api/v1/characters",
        params: {
          character: {
            name: "Nathan Drake",
            hindrance_points_earned: 0,
            hindrance_points_spent: 0
          }
        }.to_json,
        headers: json_headers

      expect(response).to have_http_status(:unauthorized)
      expect(user.characters).to be_empty
    end

    it "rejects a character with unspent hindrance points" do
      post "/api/v1/characters",
        params: {
          character: {
            name: "Nathan Drake",
            rank: "novice",
            hindrance_ids: [ hindrance.id ],
            hindrance_points_earned: 1,
            hindrance_points_spent: 0
          }
        }.to_json,
        headers: json_headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("details", "hindrance_points_spent")).to eq(
        [ "must spend all earned hindrance points before saving" ]
      )
      expect(user.characters).to be_empty
    end
  end

  describe "PUT /api/v1/characters/:id" do
    it "creates a character with selections" do
      expect {
        put_character(
          character_id,
          name: "Nathan Drake",
          rank: "seasoned",
          origin_id: origin.id,
          edge_ids: [ edge.id ],
          hindrance_ids: [ hindrance.id ],
          skill_ids: [ skill.id ]
        )
      }.to change(user.characters, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(json["character"]).to eq(
        "id" => character_id,
        "name" => "Nathan Drake",
        "rank" => "seasoned",
        "origin_id" => origin.id,
        "edge_ids" => [ edge.id ],
        "hindrance_ids" => [ hindrance.id ],
        "skill_ids" => [ skill.id ]
      )

      character = user.characters.find(character_id)
      expect(character.origin).to eq(origin)
      expect(character.edges).to contain_exactly(edge)
      expect(character.hindrances).to contain_exactly(hindrance)
      expect(character.skills).to contain_exactly(skill)
    end

    it "updates an existing character and replaces provided selections" do
      old_edge = create(:edge)
      new_edge = create(:edge)
      character = create(:character, user: user, name: "Old Name", rank: "novice")
      character.edges << old_edge

      expect {
        put_character(
          character.id,
          name: "New Name",
          rank: "veteran",
          edge_ids: [ new_edge.id ],
          hindrance_ids: [ hindrance.id ],
          skill_ids: [ skill.id ]
        )
      }.not_to change(Character, :count)

      expect(response).to have_http_status(:ok)
      expect(json.dig("character", "name")).to eq("New Name")
      expect(json.dig("character", "origin_id")).to be_nil
      expect(character.reload.rank).to eq("veteran")
      expect(character.edges).to contain_exactly(new_edge)
      expect(character.hindrances).to contain_exactly(hindrance)
      expect(character.skills).to contain_exactly(skill)
    end

    it "leaves omitted selections unchanged and clears explicitly empty selections" do
      character = create(:character, user: user)
      character.edges << edge
      character.hindrances << hindrance

      put_character(character.id, name: "Updated Name")

      expect(response).to have_http_status(:ok)
      expect(character.reload.edges).to contain_exactly(edge)
      expect(character.hindrances).to contain_exactly(hindrance)

      put_character(character.id, edge_ids: [])

      expect(response).to have_http_status(:ok)
      expect(character.reload.edges).to be_empty
      expect(character.hindrances).to contain_exactly(hindrance)
    end

    it "updates, preserves, and clears an origin" do
      character = create(:character, user: user, origin: origin)
      replacement = create(:origin)

      put_character(character.id, origin_id: replacement.id)
      expect(response).to have_http_status(:ok)
      expect(json.dig("character", "origin_id")).to eq(replacement.id)
      expect(character.reload.origin).to eq(replacement)

      put_character(character.id, name: "Updated Name")
      expect(response).to have_http_status(:ok)
      expect(json.dig("character", "origin_id")).to eq(replacement.id)

      put_character(character.id, origin_id: nil)
      expect(response).to have_http_status(:ok)
      expect(json.dig("character", "origin_id")).to be_nil
      expect(character.reload.origin).to be_nil
    end

    it "rejects invalid origin ids without changing the character" do
      character = create(:character, user: user, origin: origin, name: "Original")

      put_character(character.id, name: "Changed", origin_id: "not-an-id")

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("details", "origin_id")).to eq([ "must be an integer id or null" ])
      expect(character.reload.name).to eq("Original")
      expect(character.origin).to eq(origin)

      put_character(character.id, origin_id: 0)
      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("details", "origin_id")).to eq([ "contains unknown id: 0" ])
    end

    it "is idempotent for repeated upserts" do
      attributes = { name: "Nathan Drake", rank: "seasoned", edge_ids: [ edge.id ] }

      put_character(character_id, attributes)
      expect(response).to have_http_status(:created)

      expect {
        put_character(character_id, attributes)
      }.not_to change(Character, :count)

      expect(response).to have_http_status(:ok)
      expect(user.characters.find(character_id).edges).to contain_exactly(edge)
    end

    it "rejects a character owned by another user" do
      other_character = create(:character, name: "Other Character")

      put_character(other_character.id, name: "Hijacked")

      expect(response).to have_http_status(:forbidden)
      expect(other_character.reload.name).to eq("Other Character")
    end

    it "requires authentication" do
      delete "/api/v1/session", headers: json_headers

      expect {
        put_character(character_id, name: "Nathan Drake")
      }.not_to change(Character, :count)

      expect(response).to have_http_status(:unauthorized)
    end

    it "returns reference errors without changing the character" do
      character = create(:character, user: user, name: "Original", rank: "novice")
      character.edges << edge

      put_character(character.id, name: "Changed", rank: "seasoned", edge_ids: [ 0 ])

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["error"]).to eq("Validation failed")
      expect(json.dig("details", "edge_ids")).to eq([ "contains unknown ids: 0" ])

      character.reload
      expect(character.name).to eq("Original")
      expect(character.rank).to eq("novice")
      expect(character.edges).to contain_exactly(edge)
    end

    it "returns model validation errors without creating a character" do
      put_character(character_id, name: "", rank: "mythic")

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["error"]).to eq("Validation failed")
      expect(json.dig("details", "name")).to be_present
      expect(json.dig("details", "rank")).to be_present
      expect(Character.count).to eq(0)
    end

    it "rejects malformed reference ids" do
      put_character(character_id, name: "Nathan Drake", skill_ids: [ "not-an-id" ])

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("details", "skill_ids")).to eq([ "must contain only integer ids" ])
      expect(Character.count).to eq(0)
    end

    it "rejects invalid character ids" do
      put_character("not-a-number", name: "Nathan Drake")

      expect(response).to have_http_status(:not_found)
      expect(json["error"]).to eq("Not found")
    end

    it "requires a character payload" do
      put "/api/v1/characters/#{character_id}", params: {}.to_json, headers: json_headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["error"]).to eq("Invalid request")
    end
  end

  describe "DELETE /api/v1/characters/:id" do
    it "deletes the current user's character" do
      character = create(:character, user: user)

      expect {
        delete "/api/v1/characters/#{character.id}", headers: json_headers
      }.to change(user.characters, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end

    it "does not delete another user's character" do
      character = create(:character)

      expect {
        delete "/api/v1/characters/#{character.id}", headers: json_headers
      }.not_to change(Character, :count)

      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "CSRF protection" do
    around do |example|
      previous = ApplicationController.allow_forgery_protection
      ApplicationController.allow_forgery_protection = true
      example.run
    ensure
      ApplicationController.allow_forgery_protection = previous
    end

    it "rejects a request without a token" do
      put_character(character_id, name: "Nathan Drake")

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["error"]).to eq("Invalid authenticity token")
      expect(Character.count).to eq(0)
    end
  end
end
