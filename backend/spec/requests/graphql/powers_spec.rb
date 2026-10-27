require "rails_helper"

RSpec.describe "GraphQL powers", type: :request do
  it "returns power details and filters by rank and source book" do
    power = create(
      :power,
      name: "Arcane Bolt",
      slug: "arcane-bolt",
      rank: "novice",
      power_points: "2",
      duration: "Instant",
      range: "Smarts",
      summary: "A concise original summary.",
      source_page: 146
    )
    create(:power, name: "Veteran Power", slug: "veteran-power", rank: "veteran")

    post "/graphql",
      params: {
        query: <<~GRAPHQL,
          query($rank: Rank, $source_book: String) {
            powers(rank: $rank, source_book: $source_book) {
              nodes { id name slug rank power_points duration range summary source_book source_page }
            }
          }
        GRAPHQL
        variables: { rank: "novice", source_book: "Fantasy Companion" }
      }.to_json,
      headers: json_headers

    expect(response).to have_http_status(:ok)
    expect(json.dig("data", "powers", "nodes")).to eq([
      {
        "id" => power.id.to_s,
        "name" => "Arcane Bolt",
        "slug" => "arcane-bolt",
        "rank" => "novice",
        "power_points" => "2",
        "duration" => "Instant",
        "range" => "Smarts",
        "summary" => "A concise original summary.",
        "source_book" => "Fantasy Companion",
        "source_page" => 146
      }
    ])
  end
end
