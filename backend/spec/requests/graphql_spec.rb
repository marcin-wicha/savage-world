require "rails_helper"

RSpec.describe "GraphQL", type: :request do
  def execute(query, variables: nil)
    post "/graphql",
      params: { query: query, variables: variables }.to_json,
      headers: json_headers
  end

  it "returns origins with snake_case fields" do
    origin = create(:origin)

    execute("{ origins(first: 10) { nodes { id created_at updated_at } } }")

    expect(response).to have_http_status(:ok)
    expect(json.dig("data", "origins", "nodes")).to contain_exactly(
      "id" => origin.id.to_s,
      "created_at" => origin.created_at.iso8601,
      "updated_at" => origin.updated_at.iso8601
    )
  end

  it "paginates origins with a cursor" do
    first_origin = create(:origin)
    second_origin = create(:origin)

    execute(
      "query($first: Int) { origins(first: $first) { nodes { id } pageInfo { hasNextPage endCursor } } }",
      variables: { first: 1 }
    )

    expect(json.dig("data", "origins", "nodes")).to eq([ { "id" => first_origin.id.to_s } ])
    expect(json.dig("data", "origins", "pageInfo", "hasNextPage")).to be(true)
    cursor = json.dig("data", "origins", "pageInfo", "endCursor")

    execute(
      "query($first: Int, $after: String) { origins(first: $first, after: $after) { nodes { id } } }",
      variables: { first: 1, after: cursor }
    )

    expect(json.dig("data", "origins", "nodes")).to eq([ { "id" => second_origin.id.to_s } ])
  end

  it "returns a null viewer when signed out" do
    execute("{ viewer { id email_address } }")

    expect(response).to have_http_status(:ok)
    expect(json.dig("data", "viewer")).to be_nil
  end

  it "returns the current user as the viewer when signed in" do
    user = create(:user, password: "password123")

    post "/api/v1/session",
      params: { email_address: user.email_address, password: "password123" }.to_json,
      headers: json_headers

    execute("{ viewer { id email_address } }")

    expect(response).to have_http_status(:ok)
    expect(json.dig("data", "viewer")).to eq(
      "id" => user.id.to_s,
      "email_address" => user.email_address
    )
  end

  it "returns an error payload for invalid queries" do
    execute("{ origins {")

    expect(response).to have_http_status(:ok)
    expect(json["errors"].first["message"]).to be_present
  end
end

RSpec.describe "GraphQL CSRF protection", type: :request do
  around do |example|
    previous = ApplicationController.allow_forgery_protection
    ApplicationController.allow_forgery_protection = true
    example.run
  ensure
    ApplicationController.allow_forgery_protection = previous
  end

  it "rejects POST requests without a token" do
    post "/graphql",
      params: { query: "{ viewer { id } }" }.to_json,
      headers: json_headers

    expect(response).to have_http_status(:unprocessable_content)
    expect(json["error"]).to eq("Invalid authenticity token")
  end

  it "accepts POST requests with the CSRF cookie token" do
    get "/api/v1/session", headers: json_headers
    token = response.cookies["XSRF-TOKEN"]

    post "/graphql",
      params: { query: "{ viewer { id } }" }.to_json,
      headers: json_headers(csrf_token: token)

    expect(response).to have_http_status(:ok)
    expect(json.dig("data", "viewer")).to be_nil
  end
end
