require "rails_helper"

RSpec.describe "GraphQL hindrances", type: :request do
  def execute(query, variables: nil, locale: nil)
    headers = json_headers
    headers["X-Language"] = locale if locale
    post "/graphql",
      params: { query: query, variables: variables }.to_json,
      headers: headers
  end

  it "returns hindrances with snake_case fields and structured requirements" do
    hindrance = create(
      :hindrance,
      name: "Amorous",
      slug: "amorous",
      severity: "minor",
      requirements: [],
      source_book: "Fantasy Companion",
      source_page: 28,
      description: "Easily enamored with a pretty face."
    )

    execute(<<~GRAPHQL)
      {
        hindrances(first: 10) {
          nodes {
            id
            name
            slug
            severity
            requirements {
              kind
              value
            }
            requirements_text
            description
            source_book
            source_page
          }
        }
      }
    GRAPHQL

    expect(response).to have_http_status(:ok)
    node = json.dig("data", "hindrances", "nodes").first

    expect(node).to include(
      "id" => hindrance.id.to_s,
      "name" => "Amorous",
      "slug" => "amorous",
      "severity" => "minor",
      "requirements_text" => "",
      "description" => "Easily enamored with a pretty face.",
      "source_book" => "Fantasy Companion",
      "source_page" => 28
    )
    expect(node["requirements"]).to eq([])
  end

  it "returns Polish names when requested" do
    create(
      :hindrance,
      name: "All Thumbs",
      slug: "all-thumbs",
      severity: "minor",
      description: "Due to upbringing, lack of exposure, or pure bad luck, some individuals are \"all thumbs\" when it comes to mechanical or technological devices. All Thumbs inflicts a −2 penalty when using mechanical or electrical devices. If he rolls a Critical Failure while using such a device (and it doesn’t already have a built-in effect), it’s broken. If the GM feels it’s appropriate, it can be fixed with a Repair roll and 1d6 hours."
    )

    execute("{ hindrances { nodes { name description } } }", locale: "pl")

    expect(json.dig("data", "hindrances", "nodes", 0)).to include(
      "name" => "Złote ręce na opak",
      "description" => "Z powodu wychowania, braku doświadczenia lub zwykłego pecha niektórzy nie radzą sobie z urządzeniami mechanicznymi i technologicznymi. Ułomność ta nakłada karę −2 podczas obsługi urządzeń mechanicznych lub elektrycznych. Jeśli postać wyrzuci Krytyczną Porażkę podczas używania takiego urządzenia (o ile nie ma ono już wbudowanego efektu), urządzenie się psuje. Jeśli Mistrz Gry uzna to za stosowne, można je naprawić testem Naprawy i poświęcając 1k6 godzin."
    )
  end

  it "filters by severity and source book" do
    create(:hindrance, name: "Minor SWADE", slug: "minor-swade", severity: "minor")
    create(
      :hindrance,
      name: "Major FC",
      slug: "major-fc",
      severity: "major",
      source_book: "Fantasy Companion"
    )

    query = <<~GRAPHQL
      query($severity: HindranceSeverity, $source_book: String) {
        hindrances(severity: $severity, source_book: $source_book) {
          nodes { slug }
        }
      }
    GRAPHQL

    execute(query, variables: { severity: "major" })
    expect(json.dig("data", "hindrances", "nodes")).to eq([ { "slug" => "major-fc" } ])

    execute(query, variables: { source_book: "SWADE" })
    expect(json.dig("data", "hindrances", "nodes")).to eq([ { "slug" => "minor-swade" } ])
  end

  it "orders by name and paginates with a cursor" do
    create(:hindrance, name: "Zeta", slug: "zeta")
    create(:hindrance, name: "Alpha", slug: "alpha")

    execute(
      "query($first: Int) { hindrances(first: $first) { nodes { slug } pageInfo { hasNextPage endCursor } } }",
      variables: { first: 1 }
    )

    expect(json.dig("data", "hindrances", "nodes")).to eq([ { "slug" => "alpha" } ])
    expect(json.dig("data", "hindrances", "pageInfo", "hasNextPage")).to be(true)
    cursor = json.dig("data", "hindrances", "pageInfo", "endCursor")

    execute(
      "query($first: Int, $after: String) { hindrances(first: $first, after: $after) { nodes { slug } } }",
      variables: { first: 1, after: cursor }
    )

    expect(json.dig("data", "hindrances", "nodes")).to eq([ { "slug" => "zeta" } ])
  end

  it "accepts the frontend page size with descriptions" do
    execute(<<~GRAPHQL)
      {
        hindrances(first: 40) {
          nodes {
            id
            name
            slug
            severity
            requirements_text
            description
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    GRAPHQL

    expect(response).to have_http_status(:ok)
    expect(json["errors"]).to be_nil
  end

  it "is available without authentication" do
    execute("{ hindrances(first: 1) { nodes { id } } }")

    expect(response).to have_http_status(:ok)
    expect(json["errors"]).to be_nil
    expect(json.dig("data", "hindrances", "nodes")).to eq([])
  end
end
