require "rails_helper"

RSpec.describe "GraphQL skills", type: :request do
  def execute(query, variables: nil)
    post "/graphql",
      params: { query: query, variables: variables }.to_json,
      headers: json_headers
  end

  it "returns skills with snake_case fields" do
    skill = create(
      :skill,
      name: "Common Knowledge",
      slug: "common-knowledge",
      linked_attribute: "smarts",
      core: true,
      source_book: "SWADE",
      source_page: 30
    )

    execute(<<~GRAPHQL)
      {
        skills(first: 10) {
          nodes {
            id
            name
            slug
            attribute
            core
            source_book
            source_page
          }
        }
      }
    GRAPHQL

    expect(response).to have_http_status(:ok)
    node = json.dig("data", "skills", "nodes").first

    expect(node).to include(
      "id" => skill.id.to_s,
      "name" => "Common Knowledge",
      "slug" => "common-knowledge",
      "attribute" => "smarts",
      "core" => true,
      "source_book" => "SWADE",
      "source_page" => 30
    )
  end

  it "filters by attribute, core, and source book" do
    create(:skill, name: "Academics", slug: "academics", linked_attribute: "smarts")
    create(:skill, name: "Athletics", slug: "athletics", linked_attribute: "agility", core: true)
    create(
      :skill,
      name: "Alchemy",
      slug: "alchemy",
      linked_attribute: "smarts",
      source_book: "Fantasy Companion"
    )

    query = <<~GRAPHQL
      query($attribute: String, $core: Boolean, $source_book: String) {
        skills(attribute: $attribute, core: $core, source_book: $source_book) {
          nodes { slug }
        }
      }
    GRAPHQL

    execute(query, variables: { attribute: "smarts" })
    expect(json.dig("data", "skills", "nodes")).to eq(
      [ { "slug" => "academics" }, { "slug" => "alchemy" } ]
    )

    execute(query, variables: { core: true })
    expect(json.dig("data", "skills", "nodes")).to eq([ { "slug" => "athletics" } ])

    execute(query, variables: { core: false })
    expect(json.dig("data", "skills", "nodes")).to eq(
      [ { "slug" => "academics" }, { "slug" => "alchemy" } ]
    )

    execute(query, variables: { source_book: "Fantasy Companion" })
    expect(json.dig("data", "skills", "nodes")).to eq([ { "slug" => "alchemy" } ])
  end

  it "orders by name and paginates with a cursor" do
    create(:skill, name: "Taunt", slug: "taunt")
    create(:skill, name: "Academics", slug: "academics")

    execute(
      "query($first: Int) { skills(first: $first) { nodes { slug } pageInfo { hasNextPage endCursor } } }",
      variables: { first: 1 }
    )

    expect(json.dig("data", "skills", "nodes")).to eq([ { "slug" => "academics" } ])
    expect(json.dig("data", "skills", "pageInfo", "hasNextPage")).to be(true)
    cursor = json.dig("data", "skills", "pageInfo", "endCursor")

    execute(
      "query($first: Int, $after: String) { skills(first: $first, after: $after) { nodes { slug } } }",
      variables: { first: 1, after: cursor }
    )

    expect(json.dig("data", "skills", "nodes")).to eq([ { "slug" => "taunt" } ])
  end

  it "is available without authentication" do
    execute("{ skills(first: 1) { nodes { id } } }")

    expect(response).to have_http_status(:ok)
    expect(json["errors"]).to be_nil
    expect(json.dig("data", "skills", "nodes")).to eq([])
  end
end
