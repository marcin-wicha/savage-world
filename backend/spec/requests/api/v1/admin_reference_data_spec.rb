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

      get "/api/v1/admin/reference_data", headers: json_headers

      expect(response).to have_http_status(:ok)
      expect(json["resources"]).to include(
        { "key" => "origins", "label" => "Origins", "count" => 1 },
        { "key" => "hindrances", "label" => "Hindrances", "count" => 1 },
        { "key" => "edges", "label" => "Edges", "count" => 0 },
        { "key" => "skills", "label" => "Skills", "count" => 0 },
        { "key" => "gears", "label" => "Gear", "count" => 0 }
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
      get "/api/v1/admin/users", headers: json_headers

      expect(response).to have_http_status(:not_found)
    end
  end
end
