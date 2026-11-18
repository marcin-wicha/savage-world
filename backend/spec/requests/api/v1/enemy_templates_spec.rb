require "rails_helper"

RSpec.describe "Enemy templates", type: :request do
  let(:user) { create(:user, password: "password123") }
  let(:valid_attributes) do
    {
      name: "Orc Chieftain",
      description: "Leads the warband.",
      wild_card: true,
      attribute_dice: { agility: "d6", smarts: "d6", spirit: "d8", strength: "d12+1", vigor: "d10" },
      skills: { fighting: "d10", intimidation: "d8" },
      pace: 6,
      parry: 7,
      toughness: 11,
      armor: 3,
      weapons: [ { name: "Great Axe", damage: "Str+d10", ap: 3, two_handed: true } ],
      abilities: [ "hardy" ]
    }
  end

  describe "when signed in" do
    before { sign_in_as(user) }

    it "creates a template and defaults Wild Card bennies" do
      post "/api/v1/enemy_templates", params: { enemy_template: valid_attributes }.to_json, headers: json_headers

      expect(response).to have_http_status(:created)
      expect(json["enemy_template"]).to include(
        "name" => "Orc Chieftain",
        "wild_card" => true,
        "bennies" => 2,
        "toughness" => 11,
        "armor" => 3,
        "abilities" => [ "hardy" ]
      )
      expect(json.dig("enemy_template", "weapons")).to eq([ { "name" => "Great Axe", "damage" => "Str+d10", "ap" => 3, "two_handed" => true } ])
      expect(EnemyTemplate.last.user).to eq(user)
    end

    it "returns validation errors" do
      post "/api/v1/enemy_templates",
        params: { enemy_template: valid_attributes.merge(name: "", weapons: [ { name: "Stick", damage: "big" } ]) }.to_json,
        headers: json_headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["details"].keys).to include("name", "weapons")
    end

    it "lists shared reference templates alongside the user's own templates" do
      mine = create(:enemy_template, user: user, name: "Bandit")
      shared = create(:enemy_template, name: "Goblin", source_key: "goblin")
      create(:enemy_template, name: "Someone else's")

      get "/api/v1/enemy_templates", headers: json_headers

      expect(response).to have_http_status(:ok)
      expect(json["enemy_templates"].pluck("id")).to eq([ mine.id, shared.id ])
      expect(json["enemy_templates"].pluck("read_only")).to eq([ false, true ])
    end

    it "allows viewing but not changing shared reference templates, even for their owner" do
      shared = create(:enemy_template, name: "Goblin", source_key: "goblin")

      get "/api/v1/enemy_templates/#{shared.id}", headers: json_headers
      expect(response).to have_http_status(:ok)
      expect(json.dig("enemy_template", "read_only")).to be(true)

      patch "/api/v1/enemy_templates/#{shared.id}", params: { enemy_template: { name: "Mine" } }.to_json, headers: json_headers
      expect(response).to have_http_status(:forbidden)

      delete "/api/v1/enemy_templates/#{shared.id}", headers: json_headers
      expect(response).to have_http_status(:forbidden)
      expect(shared.reload.name).to eq("Goblin")

      sign_in_as(shared.user)
      patch "/api/v1/enemy_templates/#{shared.id}", params: { enemy_template: { name: "Edited" } }.to_json, headers: json_headers
      expect(response).to have_http_status(:forbidden)
      delete "/api/v1/enemy_templates/#{shared.id}", headers: json_headers
      expect(response).to have_http_status(:forbidden)
    end

    it "shows, updates, and deletes the user's template" do
      template = create(:enemy_template, user: user)

      get "/api/v1/enemy_templates/#{template.id}", headers: json_headers
      expect(response).to have_http_status(:ok)

      patch "/api/v1/enemy_templates/#{template.id}",
        params: { enemy_template: { name: "Goblin Boss", wild_card: true } }.to_json,
        headers: json_headers
      expect(response).to have_http_status(:ok)
      expect(json["enemy_template"]).to include("name" => "Goblin Boss", "wild_card" => true)

      delete "/api/v1/enemy_templates/#{template.id}", headers: json_headers
      expect(response).to have_http_status(:no_content)
      expect(EnemyTemplate.exists?(template.id)).to be(false)
    end

    it "forbids access to another user's template" do
      template = create(:enemy_template)

      get "/api/v1/enemy_templates/#{template.id}", headers: json_headers
      expect(response).to have_http_status(:forbidden)

      patch "/api/v1/enemy_templates/#{template.id}", params: { enemy_template: { name: "Mine" } }.to_json, headers: json_headers
      expect(response).to have_http_status(:forbidden)

      delete "/api/v1/enemy_templates/#{template.id}", headers: json_headers
      expect(response).to have_http_status(:forbidden)
      expect(template.reload.name).not_to eq("Mine")
    end

    it "returns not found for missing templates" do
      get "/api/v1/enemy_templates/999999", headers: json_headers

      expect(response).to have_http_status(:not_found)
    end
  end

  it "requires authentication" do
    get "/api/v1/enemy_templates", headers: json_headers

    expect(response).to have_http_status(:unauthorized)
  end
end
