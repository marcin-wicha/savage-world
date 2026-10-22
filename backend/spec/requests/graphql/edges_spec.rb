require "rails_helper"

RSpec.describe "GraphQL edges", type: :request do
  def execute(query, variables: nil)
    post "/graphql",
      params: { query: query, variables: variables }.to_json,
      headers: json_headers
  end

  it "returns edges with snake_case fields and structured requirements" do
    edge = create(
      :edge,
      name: "Dead Shot",
      slug: "dead-shot",
      category: "combat",
      minimum_rank: "novice",
      requirements: [
        { "kind" => "wild_card" },
        {
          "kind" => "any",
          "clauses" => [
            { "kind" => "skill", "skill" => "athletics", "die" => 8 },
            { "kind" => "skill", "skill" => "shooting", "die" => 8 }
          ]
        }
      ],
      source_book: "SWADE",
      source_page: 41
    )

    execute(<<~GRAPHQL)
      {
        edges(first: 10) {
          nodes {
            id
            name
            slug
            category
            minimum_rank
            requirements {
              kind
              attribute
              die
              skill
              slug
              name
              detail
              value
              text
              clauses { kind skill die }
            }
            requirements_text
            source_book
            source_page
            repeatable
          }
        }
      }
    GRAPHQL

    expect(response).to have_http_status(:ok)
    node = json.dig("data", "edges", "nodes").first

    expect(node).to include(
      "id" => edge.id.to_s,
      "name" => "Dead Shot",
      "slug" => "dead-shot",
      "category" => "combat",
      "minimum_rank" => "novice",
      "requirements_text" => "Novice, Wild Card, Athletics d8+ or Shooting d8+",
      "source_book" => "SWADE",
      "source_page" => 41,
      "repeatable" => false
    )
    expect(node.dig("requirements", 0, "kind")).to eq("wild_card")
    expect(node.dig("requirements", 1, "kind")).to eq("any")
    expect(node.dig("requirements", 1, "clauses")).to eq(
      [
        { "kind" => "skill", "skill" => "athletics", "die" => 8 },
        { "kind" => "skill", "skill" => "shooting", "die" => 8 }
      ]
    )
  end

  it "exposes edge requirement display names" do
    create(
      :edge,
      name: "Expert",
      slug: "expert",
      category: "legendary",
      minimum_rank: "legendary",
      requirements: [
        { "kind" => "edge", "slug" => "professional", "name" => "Professional", "detail" => "in affected Trait" }
      ]
    )

    execute("{ edges { nodes { requirements { kind slug name detail } } } }")

    expect(json.dig("data", "edges", "nodes", 0, "requirements", 0)).to eq(
      "kind" => "edge",
      "slug" => "professional",
      "name" => "Professional",
      "detail" => "in affected Trait"
    )
  end

  it "filters by category, rank, and source book" do
    create(:edge, name: "Combat Novice", slug: "combat-novice", category: "combat", minimum_rank: "novice")
    create(
      :edge,
      name: "Power Seasoned",
      slug: "power-seasoned",
      category: "power",
      minimum_rank: "seasoned",
      source_book: "Fantasy Companion"
    )

    query = <<~GRAPHQL
      query($category: EdgeCategory, $minimum_rank: Rank, $source_book: String) {
        edges(category: $category, minimum_rank: $minimum_rank, source_book: $source_book) {
          nodes { slug }
        }
      }
    GRAPHQL

    execute(query, variables: { category: "power" })
    expect(json.dig("data", "edges", "nodes")).to eq([ { "slug" => "power-seasoned" } ])

    execute(query, variables: { minimum_rank: "seasoned" })
    expect(json.dig("data", "edges", "nodes")).to eq([ { "slug" => "power-seasoned" } ])

    execute(query, variables: { source_book: "SWADE" })
    expect(json.dig("data", "edges", "nodes")).to eq([ { "slug" => "combat-novice" } ])
  end

  it "orders by name and paginates with a cursor" do
    create(:edge, name: "Zeta", slug: "zeta")
    create(:edge, name: "Alpha", slug: "alpha")

    execute(
      "query($first: Int) { edges(first: $first) { nodes { slug } pageInfo { hasNextPage endCursor } } }",
      variables: { first: 1 }
    )

    expect(json.dig("data", "edges", "nodes")).to eq([ { "slug" => "alpha" } ])
    expect(json.dig("data", "edges", "pageInfo", "hasNextPage")).to be(true)
    cursor = json.dig("data", "edges", "pageInfo", "endCursor")

    execute(
      "query($first: Int, $after: String) { edges(first: $first, after: $after) { nodes { slug } } }",
      variables: { first: 1, after: cursor }
    )

    expect(json.dig("data", "edges", "nodes")).to eq([ { "slug" => "zeta" } ])
  end

  it "is available without authentication" do
    execute("{ edges(first: 1) { nodes { id } } }")

    expect(response).to have_http_status(:ok)
    expect(json["errors"]).to be_nil
    expect(json.dig("data", "edges", "nodes")).to eq([])
  end
end
