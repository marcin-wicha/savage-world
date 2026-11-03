require "rails_helper"

RSpec.describe "Admin user approval", type: :request do
  let(:admin) { create(:user, role: :admin) }
  let!(:pending_user) { create(:user, approved: false) }

  def sign_in_as(user)
    post "/api/v1/session", params: { email_address: user.email_address, password: "password123" }.to_json,
      headers: json_headers
  end

  describe "GET /api/v1/admin/users" do
    it "lists only pending users without exposing password digests" do
      create(:user)
      sign_in_as(admin)

      get "/api/v1/admin/users", headers: json_headers

      expect(response).to have_http_status(:ok)
      expect(json["users"]).to eq([ { "id" => pending_user.id, "email_address" => pending_user.email_address, "role" => "user" } ])
    end

    it "requires an admin session" do
      get "/api/v1/admin/users", headers: json_headers
      expect(response).to have_http_status(:unauthorized)

      sign_in_as(create(:user))
      get "/api/v1/admin/users", headers: json_headers
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "PATCH /api/v1/admin/users/:id/approve" do
    it "approves a user, removes them from the pending list, and permits sign-in" do
      sign_in_as(admin)
      patch "/api/v1/admin/users/#{pending_user.id}/approve", headers: json_headers

      expect(response).to have_http_status(:ok)
      expect(json["user"]["id"]).to eq(pending_user.id)
      expect(pending_user.reload).to be_approved

      get "/api/v1/admin/users", headers: json_headers
      expect(json["users"]).to be_empty

      sign_in_as(pending_user)
      expect(response).to have_http_status(:created)
    end

    it "rejects already approved and missing users" do
      sign_in_as(admin)
      patch "/api/v1/admin/users/#{admin.id}/approve", headers: json_headers
      expect(response).to have_http_status(:unprocessable_content)

      patch "/api/v1/admin/users/0/approve", headers: json_headers
      expect(response).to have_http_status(:not_found)
    end

    it "requires authentication and forbids regular users" do
      patch "/api/v1/admin/users/#{pending_user.id}/approve", headers: json_headers
      expect(response).to have_http_status(:unauthorized)

      sign_in_as(create(:user))
      patch "/api/v1/admin/users/#{pending_user.id}/approve", headers: json_headers
      expect(response).to have_http_status(:forbidden)
      expect(pending_user.reload).not_to be_approved
    end

    it "rejects requests without a CSRF token" do
      sign_in_as(admin)
      previous = ApplicationController.allow_forgery_protection
      ApplicationController.allow_forgery_protection = true

      patch "/api/v1/admin/users/#{pending_user.id}/approve", headers: json_headers
      expect(response).to have_http_status(:unprocessable_content)
      expect(json["error"]).to eq("Invalid authenticity token")
      expect(pending_user.reload).not_to be_approved
    ensure
      ApplicationController.allow_forgery_protection = previous
    end
  end
end
