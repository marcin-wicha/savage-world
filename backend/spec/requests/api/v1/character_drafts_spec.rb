require "rails_helper"

RSpec.describe "Character drafts", type: :request do
  let(:user) { create(:user, password: "password123") }
  let(:snapshot) do
    {
      concept: { name: "Katarina Voss", description: "Sellsword" },
      hindrances: [ "3" ],
      edge_effects: { "5" => [ { kind: "trait_modifier", target: "skill", trait: "notice", modifier: 2 } ] }
    }
  end

  describe "when signed in" do
    before { sign_in_as(user) }

    it "creates a draft with the full form snapshot" do
      post "/api/v1/character_drafts", params: { character_draft: { data: snapshot, step: 2 } }.to_json, headers: json_headers

      expect(response).to have_http_status(:created)
      expect(json["character_draft"]).to include("name" => "Katarina Voss", "step" => 2)
      expect(json.dig("character_draft", "data")).to eq(snapshot.deep_stringify_keys)
      expect(CharacterDraft.last.user).to eq(user)
    end

    it "lists only the user's drafts, newest first, without their data" do
      older = create(:character_draft, user: user, updated_at: 2.days.ago)
      newer = create(:character_draft, user: user, updated_at: 1.hour.ago)
      create(:character_draft)

      get "/api/v1/character_drafts", headers: json_headers

      expect(response).to have_http_status(:ok)
      expect(json["character_drafts"].pluck("id")).to eq([ newer.id, older.id ])
      expect(json["character_drafts"].first.keys).to contain_exactly("id", "name", "step", "updated_at")
    end

    it "shows, updates, and deletes the user's draft" do
      draft = create(:character_draft, user: user)

      get "/api/v1/character_drafts/#{draft.id}", headers: json_headers
      expect(response).to have_http_status(:ok)
      expect(json.dig("character_draft", "data", "concept", "name")).to eq("Katarina Voss")

      patch "/api/v1/character_drafts/#{draft.id}",
        params: { character_draft: { data: { concept: { name: "Mira" } }, step: 4 } }.to_json,
        headers: json_headers
      expect(response).to have_http_status(:ok)
      expect(draft.reload).to have_attributes(name: "Mira", step: 4)

      delete "/api/v1/character_drafts/#{draft.id}", headers: json_headers
      expect(response).to have_http_status(:no_content)
      expect(CharacterDraft.exists?(draft.id)).to be(false)
    end

    it "keeps the stored data when only the step changes" do
      draft = create(:character_draft, user: user)

      patch "/api/v1/character_drafts/#{draft.id}", params: { character_draft: { step: 3 } }.to_json, headers: json_headers

      expect(response).to have_http_status(:ok)
      expect(draft.reload.step).to eq(3)
      expect(draft.name).to eq("Katarina Voss")
    end

    it "rejects invalid drafts" do
      post "/api/v1/character_drafts", params: { character_draft: { data: [ 1, 2 ], step: -1 } }.to_json, headers: json_headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["details"].keys).to include("data", "step")
    end

    it "rejects a draft body that is not an object" do
      post "/api/v1/character_drafts", params: { character_draft: "draft" }.to_json, headers: json_headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["error"]).to eq("Invalid request")
    end

    it "rejects drafts beyond the per-user limit" do
      create_list(:character_draft, CharacterDraft::MAX_PER_USER, user: user)

      post "/api/v1/character_drafts", params: { character_draft: { data: snapshot, step: 0 } }.to_json, headers: json_headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("details", "base").first).to match(/at most 20 drafts/)
    end

    it "forbids another user's draft" do
      draft = create(:character_draft)

      get "/api/v1/character_drafts/#{draft.id}", headers: json_headers
      expect(response).to have_http_status(:forbidden)

      patch "/api/v1/character_drafts/#{draft.id}", params: { character_draft: { step: 3 } }.to_json, headers: json_headers
      expect(response).to have_http_status(:forbidden)

      delete "/api/v1/character_drafts/#{draft.id}", headers: json_headers
      expect(response).to have_http_status(:forbidden)
      expect(draft.reload.step).to eq(1)
    end

    it "returns not found for unknown drafts" do
      get "/api/v1/character_drafts/0", headers: json_headers

      expect(response).to have_http_status(:not_found)
    end
  end

  it "requires authentication" do
    get "/api/v1/character_drafts", headers: json_headers
    expect(response).to have_http_status(:unauthorized)

    post "/api/v1/character_drafts", params: { character_draft: { data: snapshot, step: 0 } }.to_json, headers: json_headers
    expect(response).to have_http_status(:unauthorized)
  end
end
