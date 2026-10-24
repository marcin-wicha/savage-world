require "rails_helper"

RSpec.describe "GraphQL gear", type: :request do
  def execute(query, variables: nil)
    post "/graphql",
      params: { query: query, variables: variables }.to_json,
      headers: json_headers
  end

  it "returns structured gear rules, costs, descriptions, and artwork" do
    gear = create(
      :gear,
      name: "Long Bow",
      slug: "long-bow",
      category: "ranged_weapon",
      cost: 75,
      cost_text: "75",
      requirements: [ { "kind" => "strength", "value" => "d8" } ],
      effects: { "range" => "15/30/60", "damage" => "2d6", "ap" => 1 },
      description: "A bow with exceptional range.",
      artwork_url: "https://example.test/gear/long-bow.png",
      source_page: 58
    )

    execute(<<~GRAPHQL)
      {
        gear(first: 10) {
          nodes {
            id
            name
            slug
            category
            cost
            cost_text
            requirements
            effects
            description
            artwork_url
            source_book
            source_page
          }
        }
      }
    GRAPHQL

    expect(response).to have_http_status(:ok)
    node = json.dig("data", "gear", "nodes").first
    expect(node).to include(
      "id" => gear.id.to_s,
      "name" => "Long Bow",
      "slug" => "long-bow",
      "category" => "ranged_weapon",
      "cost" => 75.0,
      "cost_text" => "75",
      "requirements" => [ { "kind" => "strength", "value" => "d8" } ],
      "effects" => { "range" => "15/30/60", "damage" => "2d6", "ap" => 1 },
      "description" => "A bow with exceptional range.",
      "artwork_url" => "https://example.test/gear/long-bow.png",
      "source_book" => "Fantasy Companion",
      "source_page" => 58
    )
  end

  it "filters by category and source book" do
    create(:gear, slug: "general-rope", name: "Rope", category: "general")
    create(:gear, slug: "fantasy-sword", name: "Sword", category: "melee_weapon")

    query = <<~GRAPHQL
      query($category: GearCategory, $source_book: String) {
        gear(category: $category, source_book: $source_book) { nodes { slug } }
      }
    GRAPHQL

    execute(query, variables: { category: "melee_weapon" })
    expect(json.dig("data", "gear", "nodes")).to eq([ { "slug" => "fantasy-sword" } ])

    execute(query, variables: { source_book: "Fantasy Companion" })
    expect(json.dig("data", "gear", "nodes").map { |node| node["slug"] }).to contain_exactly(
      "fantasy-sword", "general-rope"
    )
  end

  it "orders by name and paginates with a cursor" do
    create(:gear, name: "Zeta", slug: "zeta")
    create(:gear, name: "Alpha", slug: "alpha")

    execute("{ gear(first: 1) { nodes { slug } pageInfo { hasNextPage endCursor } } }")

    expect(json.dig("data", "gear", "nodes")).to eq([ { "slug" => "alpha" } ])
    cursor = json.dig("data", "gear", "pageInfo", "endCursor")

    execute(
      "query($first: Int, $after: String) { gear(first: $first, after: $after) { nodes { slug } } }",
      variables: { first: 1, after: cursor }
    )

    expect(json.dig("data", "gear", "nodes")).to eq([ { "slug" => "zeta" } ])
  end

  it "is available without authentication" do
    execute("{ gear(first: 1) { nodes { id } } }")

    expect(response).to have_http_status(:ok)
    expect(json["errors"]).to be_nil
  end
end
