require "rails_helper"

RSpec.describe "Registrations", type: :request do
  let(:attributes) do
    { email_address: " New@Example.com ", password: "password123", password_confirmation: "password123" }
  end

  it "registers a pending user without starting a session or accepting a supplied role" do
    expect {
      post "/api/v1/registrations", params: { user: attributes.merge(role: "admin", approved: true) }.to_json,
        headers: json_headers
    }.to change(User, :count).by(1).and change(Session, :count).by(0)

    expect(response).to have_http_status(:created)
    expect(json).to eq("message" => "Registration pending approval")
    expect(User.last).to have_attributes(email_address: "new@example.com", role: "user", approved: false)
    expect(response.cookies["session_id"]).to be_nil
  end

  it "rejects duplicate email addresses and mismatched passwords" do
    create(:user, email_address: "new@example.com")

    post "/api/v1/registrations", params: { user: attributes }.to_json, headers: json_headers
    expect(response).to have_http_status(:unprocessable_content)
    expect(json.dig("details", "email_address")).to be_present

    post "/api/v1/registrations", params: { user: attributes.merge(email_address: "other@example.com", password_confirmation: "wrong") }.to_json,
      headers: json_headers
    expect(response).to have_http_status(:unprocessable_content)
    expect(json.dig("details", "password_confirmation")).to be_present
  end

  it "requires password confirmation" do
    expect {
      post "/api/v1/registrations", params: { user: attributes.except(:password_confirmation) }.to_json,
        headers: json_headers
    }.not_to change(User, :count)

    expect(response).to have_http_status(:unprocessable_content)
    expect(json.dig("details", "password_confirmation")).to be_present
  end

  it "rejects missing input and empty passwords" do
    post "/api/v1/registrations", params: {}.to_json, headers: json_headers
    expect(response).to have_http_status(:unprocessable_content)

    post "/api/v1/registrations", params: { user: attributes.except(:password, :password_confirmation) }.to_json,
      headers: json_headers
    expect(response).to have_http_status(:unprocessable_content)
    expect(json.dig("details", "password")).to be_present
  end

  it "accepts a registration with a CSRF token" do
    previous = ApplicationController.allow_forgery_protection
    ApplicationController.allow_forgery_protection = true
    get "/api/v1/session", headers: json_headers

    post "/api/v1/registrations", params: { user: attributes }.to_json,
      headers: json_headers(csrf_token: response.cookies["XSRF-TOKEN"])

    expect(response).to have_http_status(:created)
    expect(User.last).not_to be_approved
  ensure
    ApplicationController.allow_forgery_protection = previous
  end

  it "rejects requests without a CSRF token" do
    previous = ApplicationController.allow_forgery_protection
    ApplicationController.allow_forgery_protection = true

    expect {
      post "/api/v1/registrations", params: { user: attributes }.to_json, headers: json_headers
    }.not_to change(User, :count)
    expect(response).to have_http_status(:unprocessable_content)
    expect(json["error"]).to eq("Invalid authenticity token")
  ensure
    ApplicationController.allow_forgery_protection = previous
  end
end
