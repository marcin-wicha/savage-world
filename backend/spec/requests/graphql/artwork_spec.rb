require "rails_helper"

RSpec.describe "Reference artwork", type: :request do
  { origin: "origins", edge: "edges", hindrance: "hindrances", skill: "skills", gear: "gear" }.each do |factory, field|
    it "exposes stored and null artwork for #{field} without authentication" do
      record = create(factory, artwork_url: "/custom/artwork.webp")
      blank = create(factory, artwork_url: nil)
      post "/graphql", params: { query: "{ #{field}(first: 10) { nodes { id artwork_url } } }" }.to_json,
        headers: json_headers

      expect(response).to have_http_status(:ok)
      expect(json["errors"]).to be_nil
      expect(json.dig("data", field, "nodes")).to contain_exactly(
        { "id" => record.id.to_s, "artwork_url" => "/custom/artwork.webp" },
        { "id" => blank.id.to_s, "artwork_url" => nil }
      )
    end
  end
end
