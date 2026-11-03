require "rails_helper"
require "tempfile"

RSpec.describe "Admin artwork upload", type: :request do
  let(:record) { create(:origin, artwork_url: "/existing.png") }
  let(:upload_path) { "/api/v1/admin/origins/#{record.id}/artwork" }
  let(:png) { "\x89PNG\r\n\x1a\n".b + "image data" }

  def sign_in_as(user)
    post "/api/v1/session", params: { email_address: user.email_address, password: "password123" }.to_json,
      headers: json_headers
  end

  def upload(bytes = png, type: "image/png")
    Tempfile.create([ "artwork", ".png" ]) do |file|
      file.binmode
      file.write(bytes)
      file.flush
      post upload_path, params: { file: Rack::Test::UploadedFile.new(file.path, type) }
    end
  end

  after do
    url = record.reload.artwork_url
    filename = url.split("/").last if url.start_with?("/api/v1/artwork/")
    File.delete(ReferenceData::ArtworkUpload.path(filename)) if filename && ReferenceData::ArtworkUpload.path(filename).exist?
  end

  it "stores and publicly serves artwork for each supported resource" do
    sign_in_as(create(:user, role: :admin))
    { "origins" => :origin, "hindrances" => :hindrance, "edges" => :edge,
      "skills" => :skill, "gears" => :gear }.each do |resource, factory|
      item = create(factory)
      Tempfile.create([ "artwork", ".png" ]) do |file|
        file.binmode
        file.write(png)
        file.flush
        post "/api/v1/admin/#{resource}/#{item.id}/artwork",
          params: { file: Rack::Test::UploadedFile.new(file.path, "image/png") }
      end
      expect(response).to have_http_status(:ok)
      url = response.parsed_body.fetch("artwork_url")
      expect(item.reload.artwork_url).to eq(url)
      delete "/api/v1/session"
      get url
      expect(response).to have_http_status(:ok)
      expect(response.body.b).to eq(png)
      expect(response.media_type).to eq("image/png")
      expect(response.headers["X-Content-Type-Options"]).to eq("nosniff")
      File.delete(ReferenceData::ArtworkUpload.path(url.split("/").last))
      sign_in_as(create(:user, role: :admin))
    end
  end

  it "requires authentication and admin authorization without changing artwork" do
    upload
    expect(response).to have_http_status(:unauthorized)
    sign_in_as(create(:user))
    upload
    expect(response).to have_http_status(:forbidden)
    expect(record.reload.artwork_url).to eq("/existing.png")
  end

  it "rejects absent, oversized, and forged files without changing artwork" do
    sign_in_as(create(:user, role: :admin))
    post upload_path
    expect(response).to have_http_status(:unprocessable_content)
    upload("x" * (ReferenceData::ArtworkUpload::MAX_BYTES + 1))
    expect(response).to have_http_status(:unprocessable_content)
    upload("<svg>unsafe</svg>", type: "image/svg+xml")
    expect(response).to have_http_status(:unprocessable_content)
    upload("not a png")
    expect(response).to have_http_status(:unprocessable_content)
    expect(record.reload.artwork_url).to eq("/existing.png")
  end

  it "does not expose unknown resources, missing records, or stale filenames" do
    sign_in_as(create(:user, role: :admin))
    post "/api/v1/admin/powers/1/artwork"
    expect(response).to have_http_status(:not_found)
    post "/api/v1/admin/origins/0/artwork"
    expect(response).to have_http_status(:not_found)
    upload
    url = response.parsed_body.fetch("artwork_url")
    get "#{url}f"
    expect(response).to have_http_status(:not_found)
    record.update!(artwork_url: "/other.png")
    get url
    expect(response).to have_http_status(:not_found)
    File.delete(ReferenceData::ArtworkUpload.path(url.split("/").last))
  end

  it "rejects missing CSRF tokens when forgery protection is enabled" do
    sign_in_as(create(:user, role: :admin))
    previous = ApplicationController.allow_forgery_protection
    ApplicationController.allow_forgery_protection = true
    upload
    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body["error"]).to eq("Invalid authenticity token")
    expect(record.reload.artwork_url).to eq("/existing.png")
  ensure
    ApplicationController.allow_forgery_protection = previous
  end
end
