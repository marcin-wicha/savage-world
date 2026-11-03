require "rails_helper"

RSpec.describe "Hidden reference data", type: :request do
  {
    origins: :origin,
    edges: :edge,
    hindrances: :hindrance,
    skills: :skill,
    gear: :gear
  }.each do |field, factory|
    it "excludes hidden #{field} from public catalog results and pagination" do
      visible = create(factory, name: "Z Visible")
      create(factory, name: "A Hidden", hidden: true)

      post "/graphql",
        params: { query: "{ #{field}(first: 1) { nodes { id } pageInfo { hasNextPage } } }" }.to_json,
        headers: json_headers

      expect(response).to have_http_status(:ok)
      expect(json["errors"]).to be_nil
      expect(json.dig("data", field.to_s, "nodes")).to eq([ { "id" => visible.id.to_s } ])
      expect(json.dig("data", field.to_s, "pageInfo", "hasNextPage")).to be(false)
    end
  end
end
