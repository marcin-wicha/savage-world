require "rails_helper"

RSpec.describe "Admin reference data", type: :request do
  let(:user) { create(:user, password: "password123", role: role) }
  let(:role) { :admin }

  before do
    post "/api/v1/session",
      params: { email_address: user.email_address, password: "password123" }.to_json,
      headers: json_headers
  end

  describe "GET /api/v1/admin/reference_data" do
    it "lists the editable resources for admins" do
      create(:origin)
      create(:hindrance)
      create(:power)

      get "/api/v1/admin/reference_data", headers: json_headers

      expect(response).to have_http_status(:ok)
      expect(json["resources"]).to include(
        { "key" => "origins", "label" => "Origins", "count" => 1 },
        { "key" => "hindrances", "label" => "Hindrances", "count" => 1 },
        { "key" => "edges", "label" => "Edges", "count" => 0 },
        { "key" => "skills", "label" => "Skills", "count" => 0 },
        { "key" => "gears", "label" => "Gear", "count" => 0 },
        { "key" => "powers", "label" => "Powers", "count" => 1 }
      )
    end

    context "when signed out" do
      before { delete "/api/v1/session", headers: json_headers }

      it "requires authentication" do
        get "/api/v1/admin/reference_data", headers: json_headers

        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "when signed in as a regular user" do
      let(:role) { :user }

      it "forbids access" do
        get "/api/v1/admin/reference_data", headers: json_headers

        expect(response).to have_http_status(:forbidden)
      end
    end
  end

  describe "reference data CRUD" do
    %w[origins edges hindrances skills gears].each do |resource|
      it "allows admins to hide and unhide #{resource} while keeping them in the admin list" do
        model = { "origins" => Origin, "edges" => Edge, "hindrances" => Hindrance, "skills" => Skill, "gears" => Gear }.fetch(resource)
        factory = resource == "gears" ? :gear : resource.singularize.to_sym
        record = create(factory)
        expect(record.hidden).to be(false)

        patch "/api/v1/admin/#{resource}/#{record.id}",
          params: { record: { hidden: true } }.to_json,
          headers: json_headers

        expect(response).to have_http_status(:ok)
        expect(json.dig("record", "hidden")).to be(true)
        expect(model.find(record.id).hidden).to be(true)

        get "/api/v1/admin/#{resource}", headers: json_headers
        expect(json.fetch("records").find { |entry| entry["id"] == record.id }["hidden"]).to be(true)

        patch "/api/v1/admin/#{resource}/#{record.id}",
          params: { record: { hidden: false } }.to_json,
          headers: json_headers

        expect(response).to have_http_status(:ok)
        expect(record.reload.hidden).to be(false)
      end
    end

    it "accepts hidden when creating a reference record" do
      post "/api/v1/admin/origins",
        params: { record: { name: "Secret Origin", description: "Hidden from the catalog.", hidden: true } }.to_json,
        headers: json_headers

      expect(response).to have_http_status(:created)
      expect(json.dig("record", "hidden")).to be(true)
      expect(Origin.find(json.dig("record", "id")).hidden).to be(true)
    end

    context "when signed in as a regular user" do
      let(:role) { :user }

      it "cannot change hidden reference data" do
        record = create(:origin, hidden: true)

        patch "/api/v1/admin/origins/#{record.id}",
          params: { record: { hidden: false } }.to_json,
          headers: json_headers

        expect(response).to have_http_status(:forbidden)
        expect(record.reload.hidden).to be(true)
      end
    end

    it "creates, updates, and deletes an origin" do
      post "/api/v1/admin/origins",
        params: {
          record: { name: "Human", description: "A versatile origin." }
        }.to_json,
        headers: json_headers

      expect(response).to have_http_status(:created)
      origin = Origin.find(json.dig("record", "id"))
      expect(origin).to have_attributes(name: "Human", slug: "human")

      patch "/api/v1/admin/origins/#{origin.id}",
        params: { record: { name: "Dwarf", description: "A sturdy origin." } }.to_json,
        headers: json_headers

      expect(response).to have_http_status(:ok)
      expect(origin.reload).to have_attributes(name: "Dwarf", slug: "human")

      delete "/api/v1/admin/origins/#{origin.id}", headers: json_headers

      expect(response).to have_http_status(:no_content)
      expect(Origin.exists?(origin.id)).to be(false)
    end

    it "returns enum values in their form-friendly representation" do
      hindrance = create(:hindrance, severity: :major)
      edge = create(:edge, minimum_rank: :veteran)

      get "/api/v1/admin/hindrances", headers: json_headers
      expect(json["records"].find { |record| record["id"] == hindrance.id }["severity"]).to eq("major")

      get "/api/v1/admin/edges", headers: json_headers
      expect(json["records"].find { |record| record["id"] == edge.id }["minimum_rank"]).to eq("veteran")

      power = create(:power, rank: :heroic)
      get "/api/v1/admin/powers", headers: json_headers
      expect(json["records"].find { |record| record["id"] == power.id }["rank"]).to eq("heroic")
    end

    it "rejects invalid records with field details" do
      post "/api/v1/admin/skills",
        params: { record: { name: "", linked_attribute: "invalid" } }.to_json,
        headers: json_headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["error"]).to eq("Validation failed")
      expect(json["details"]).to include("name", "linked_attribute", "source_book", "source_page")
    end

    it "does not expose arbitrary resource classes" do
      get "/api/v1/admin/sessions", headers: json_headers

      expect(response).to have_http_status(:not_found)
    end
  end
end
