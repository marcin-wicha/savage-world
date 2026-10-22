require "rails_helper"

RSpec.describe "Sessions", type: :request do
  let(:user) { create(:user, password: "password123") }

  describe "GET /api/v1/session" do
    it "returns no user and a CSRF token when signed out" do
      get "/api/v1/session", headers: json_headers

      expect(response).to have_http_status(:ok)
      expect(json["user"]).to be_nil
      expect(json["csrf_token"]).to be_present
      expect(response.cookies["XSRF-TOKEN"]).to be_present
    end

    it "returns the current user when signed in" do
      post "/api/v1/session",
        params: { email_address: user.email_address, password: "password123" }.to_json,
        headers: json_headers

      get "/api/v1/session", headers: json_headers

      expect(response).to have_http_status(:ok)
      expect(json["user"]).to eq("id" => user.id, "email_address" => user.email_address)
    end
  end

  describe "authentication hint" do
    it "clears a stale hint for signed-out requests" do
      cookies[:sw_authenticated] = "1"

      get "/api/v1/session", headers: json_headers

      expect(response.cookies["sw_authenticated"]).to be_nil
    end

    it "restores the hint when a signed-in session is resumed" do
      post "/api/v1/session",
        params: { email_address: user.email_address, password: "password123" }.to_json,
        headers: json_headers
      cookies.delete("sw_authenticated")

      get "/api/v1/session", headers: json_headers

      expect(response.cookies["sw_authenticated"]).to eq("1")
    end
  end

  describe "POST /api/v1/session" do
    it "creates a session and sets a session cookie" do
      expect {
        post "/api/v1/session",
          params: { email_address: user.email_address, password: "password123" }.to_json,
          headers: json_headers
      }.to change(Session, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(json["user"]).to eq("id" => user.id, "email_address" => user.email_address)
      expect(response.cookies["session_id"]).to be_present
      expect(response.headers["Set-Cookie"].join).to include("httponly")
      expect(response.cookies["sw_authenticated"]).to eq("1")

      hint_cookie = Array(response.headers["Set-Cookie"]).find do |cookie|
        cookie.start_with?("sw_authenticated=")
      end
      expect(hint_cookie).to be_present
      expect(hint_cookie.downcase).not_to include("httponly")
    end

    it "rejects invalid credentials" do
      post "/api/v1/session",
        params: { email_address: user.email_address, password: "wrong-password" }.to_json,
        headers: json_headers

      expect(response).to have_http_status(:unauthorized)
      expect(json["error"]).to eq("Invalid email address or password")
    end
  end

  describe "DELETE /api/v1/session" do
    it "destroys the session and clears the cookie" do
      post "/api/v1/session",
        params: { email_address: user.email_address, password: "password123" }.to_json,
        headers: json_headers

      expect {
        delete "/api/v1/session", headers: json_headers
      }.to change(Session, :count).by(-1)

      expect(response).to have_http_status(:no_content)
      expect(response.cookies["sw_authenticated"]).to be_nil

      get "/api/v1/session", headers: json_headers
      expect(json["user"]).to be_nil
    end

    it "requires authentication" do
      delete "/api/v1/session", headers: json_headers

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "CSRF protection" do
    around do |example|
      previous = ApplicationController.allow_forgery_protection
      ApplicationController.allow_forgery_protection = true
      example.run
    ensure
      ApplicationController.allow_forgery_protection = previous
    end

    it "rejects a request without a token" do
      post "/api/v1/session",
        params: { email_address: user.email_address, password: "password123" }.to_json,
        headers: json_headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["error"]).to eq("Invalid authenticity token")
    end

    it "accepts a request with the token from the CSRF cookie" do
      get "/api/v1/session", headers: json_headers
      token = response.cookies["XSRF-TOKEN"]

      post "/api/v1/session",
        params: { email_address: user.email_address, password: "password123" }.to_json,
        headers: json_headers(csrf_token: token)

      expect(response).to have_http_status(:created)
    end
  end
end
