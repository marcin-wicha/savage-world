require "rails_helper"

RSpec.describe "Character drafts and lifecycle", type: :request do
  let(:user) { create(:user, password: "password123") }
  let(:origin) { create(:origin) }
  let(:major) { create(:hindrance, severity: "major") }
  let(:flexible) { create(:hindrance, severity: "minor_or_major") }
  let(:edge) { create(:edge) }

  before { sign_in_as(user) }

  def finalize(character, attributes = nil)
    body = attributes ? { character: attributes } : {}
    post "/api/v1/characters/#{character.id}/finalize", params: body.to_json, headers: json_headers
  end

  describe "autosaving a draft" do
    let(:draft) { create(:character, :draft, user: user) }

    it "stores partial progress, the wizard step, the concept, and severity choices" do
      put "/api/v1/characters/#{draft.id}",
        params: {
          character: {
            name: "Mira",
            concept: "Desert scout",
            creation_step: 3,
            hindrance_ids: [ flexible.id ],
            hindrance_severities: { flexible.id.to_s => "major" }
          }
        }.to_json,
        headers: json_headers

      expect(response).to have_http_status(:ok)
      expect(json["character"]).to include(
        "status" => "draft",
        "concept" => "Desert scout",
        "creation_step" => 3,
        "updated_at" => be_present,
        "hindrance_severities" => { flexible.id.to_s => "major" },
        "creation_points" => { "earned" => 2, "spent" => { "attributes" => 0, "skills" => 0, "edges" => 0 } }
      )
      expect(draft.reload.character_hindrances.sole.severity).to eq("major")
      expect(json.dig("character", "hindrances")).to eq([
        { "id" => flexible.id, "name" => flexible.name, "slug" => flexible.slug, "severity" => "major" }
      ])
    end

    it "rejects invalid severity choices" do
      put "/api/v1/characters/#{draft.id}",
        params: { character: { hindrance_ids: [ flexible.id ], hindrance_severities: { flexible.id.to_s => "huge" } } }.to_json,
        headers: json_headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("details", "hindrance_severities")).to eq([ "must map hindrance ids to minor or major" ])
    end

    it "does not let a draft skip finalization through its status" do
      put "/api/v1/characters/#{draft.id}", params: { character: { status: "alive" } }.to_json, headers: json_headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("details", "status")).to eq([ "can only change after the character is finalized" ])
      expect(draft.reload).to be_draft
    end
  end

  describe "POST /api/v1/characters/:id/finalize" do
    it "turns a complete draft into a living character" do
      draft = create(:character, :draft, user: user, name: "Mira", origin: origin, creation_step: 7)
      draft.hindrances << major
      draft.edges << edge

      finalize(draft)

      expect(response).to have_http_status(:ok)
      expect(json["character"]).to include("status" => "alive", "creation_step" => 0)
      expect(draft.reload).to be_alive
    end

    it "applies the submitted changes before checking the rules" do
      draft = create(:character, :draft, user: user)

      finalize(draft, name: "Mira", origin_id: origin.id, hindrance_ids: [ major.id ], edge_ids: [ edge.id ])

      expect(response).to have_http_status(:ok)
      expect(draft.reload).to have_attributes(name: "Mira", status: "alive", edge_ids: [ edge.id ])
    end

    it "checks hindrance points on the server instead of trusting the client" do
      draft = create(:character, :draft, user: user, name: "Mira", origin: origin)

      finalize(draft, hindrance_ids: [ major.id ], hindrance_points_earned: 2, hindrance_points_spent: 2)

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("details", "hindrance_points_spent")).to eq([ "must spend all earned hindrance points before saving" ])
      expect(draft.reload).to be_draft
      expect(draft.hindrance_ids).to be_empty
    end

    it "rejects overspent points" do
      draft = create(:character, :draft, user: user, name: "Mira", origin: origin)
      draft.edges << edge

      finalize(draft)

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("details", "hindrance_points_spent")).to eq([ "exceed the 0 earned hindrance points" ])
    end

    it "requires a name and an origin" do
      draft = create(:character, :draft, user: user)

      finalize(draft)

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["details"]).to include("name" => [ "can't be blank" ], "origin_id" => [ "must be chosen" ])
      expect(draft.reload).to be_draft
    end

    it "rejects characters that are already finished" do
      character = create(:character, user: user)

      finalize(character)

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("details", "status")).to eq([ "is already finalized" ])
    end

    it "forbids another user's draft" do
      draft = create(:character, :draft)

      finalize(draft)

      expect(response).to have_http_status(:forbidden)
      expect(draft.reload).to be_draft
    end

    it "returns not found for unknown characters" do
      post "/api/v1/characters/999999/finalize", params: {}.to_json, headers: json_headers

      expect(response).to have_http_status(:not_found)
    end

    it "requires authentication" do
      draft = create(:character, :draft, user: user)
      delete "/api/v1/session", headers: json_headers

      finalize(draft)

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "marking a character dead" do
    it "lets the owner move a finished character between alive and dead" do
      character = create(:character, user: user)

      put "/api/v1/characters/#{character.id}", params: { character: { status: "dead" } }.to_json, headers: json_headers
      expect(response).to have_http_status(:ok)
      expect(character.reload).to be_dead

      put "/api/v1/characters/#{character.id}", params: { character: { status: "alive" } }.to_json, headers: json_headers
      expect(character.reload).to be_alive
    end

    it "never returns a character to draft" do
      character = create(:character, user: user)

      put "/api/v1/characters/#{character.id}", params: { character: { status: "draft" } }.to_json, headers: json_headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("details", "status")).to eq([ "must be alive or dead" ])
      expect(character.reload).to be_alive
    end
  end

  it "lists drafts alongside finished characters with their status" do
    draft = create(:character, :draft, user: user)
    finished = create(:character, user: user)

    get "/api/v1/characters", headers: json_headers

    expect(json["characters"].to_h { |character| [ character["id"], character["status"] ] })
      .to eq(draft.id => "draft", finished.id => "alive")
  end
end
