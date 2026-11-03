require "rails_helper"

RSpec.describe "Admin artwork", type: :request do
  def sign_in(role)
    user = create(:user, role: role, password: "password123")
    post "/api/v1/session", params: { email_address: user.email_address, password: "password123" }.to_json,
      headers: json_headers
  end

  { origin: "origins", edge: "edges", hindrance: "hindrances", skill: "skills", gear: "gears" }.each do |factory, resource|
    it "allows admins to set, read, and clear #{resource} artwork" do
      sign_in(:admin)
      record = create(factory)
      [ "/custom.webp", nil ].each do |url|
        patch "/api/v1/admin/#{resource}/#{record.id}",
          params: { record: { artwork_url: url } }.to_json, headers: json_headers
        expect(response).to have_http_status(:ok)
        expect(record.reload.artwork_url).to eq(url)
        expect(json.dig("record", "artwork_url")).to eq(url)

        get "/api/v1/admin/#{resource}", headers: json_headers
        expect(json["records"].find { |row| row["id"] == record.id }["artwork_url"]).to eq(url)
      end
    end

    [ nil, :user ].each do |role|
      it "rejects #{role || 'signed out'} artwork writes to #{resource}" do
        sign_in(role) if role
        record = create(factory, artwork_url: "/original.webp")
        patch "/api/v1/admin/#{resource}/#{record.id}",
          params: { record: { artwork_url: nil } }.to_json, headers: json_headers
        expect(response).to have_http_status(role ? :forbidden : :unauthorized)
        expect(record.reload.artwork_url).to eq("/original.webp")
      end
    end
  end
end
