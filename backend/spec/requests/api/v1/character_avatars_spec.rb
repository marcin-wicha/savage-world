require "rails_helper"
require "tempfile"
require "tmpdir"

RSpec.describe "Character avatars", type: :request do
  let(:owner) { create(:user) }
  let(:character) { create(:character, user: owner) }
  let(:png) { "\x89PNG\r\n\x1a\n".b + "avatar data" }
  let(:jpeg) { "\xff\xd8\xff".b + "other avatar" }
  let(:storage) { Pathname.new(Dir.mktmpdir("avatars")) }

  before { allow(Characters::AvatarUpload).to receive(:directory).and_return(storage) }
  after { FileUtils.rm_rf(storage) }

  def upload(bytes = png, type: "image/png", id: character.id)
    Tempfile.create([ "avatar", ".img" ]) do |file|
      file.binmode
      file.write(bytes)
      file.flush
      post "/api/v1/characters/#{id}/avatar", params: { file: Rack::Test::UploadedFile.new(file.path, type) }
    end
  end

  describe "POST /api/v1/characters/:id/avatar" do
    it "stores the avatar and exposes it in the character payload" do
      sign_in_as(owner)
      upload

      expect(response).to have_http_status(:ok)
      url = response.parsed_body.fetch("avatar_url")
      expect(url).to eq("/api/v1/characters/#{character.id}/avatar/#{character.reload.avatar_filename}")

      get "/api/v1/characters", headers: json_headers
      expect(response.parsed_body.dig("characters", 0, "avatar_url")).to eq(url)

      get url
      expect(response).to have_http_status(:ok)
      expect(response.media_type).to eq("image/png")
      expect(response.body.b).to eq(png)
      expect(response.headers["X-Content-Type-Options"]).to eq("nosniff")
    end

    it "replaces the previous avatar file" do
      sign_in_as(owner)
      upload
      first = character.reload.avatar_filename
      upload(jpeg, type: "image/jpeg")

      expect(response).to have_http_status(:ok)
      expect(character.reload.avatar_filename).not_to eq(first)
      expect(storage.join(first)).not_to exist
      expect(storage.children.size).to eq(1)
    end

    it "requires authentication" do
      upload
      expect(response).to have_http_status(:unauthorized)
      expect(character.reload.avatar_filename).to be_nil
    end

    it "forbids uploading to another user's character" do
      sign_in_as(create(:user))
      upload
      expect(response).to have_http_status(:forbidden)
      expect(character.reload.avatar_filename).to be_nil
    end

    it "returns 404 for an unknown character" do
      sign_in_as(owner)
      upload(id: 0)
      expect(response).to have_http_status(:not_found)
    end

    it "rejects missing, unsupported, mismatched, and oversized files" do
      sign_in_as(owner)

      post "/api/v1/characters/#{character.id}/avatar"
      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["error"]).to eq("An image file is required")

      upload("<svg/>", type: "image/svg+xml")
      expect(response.parsed_body["error"]).to eq("Supported formats: PNG, JPEG, GIF, WebP")

      upload("not a png")
      expect(response.parsed_body["error"]).to eq("Image content does not match its type")

      upload(png + ("x" * Characters::AvatarUpload::MAX_BYTES))
      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["error"]).to eq("Image must be between 1 byte and 5 MB")

      expect(character.reload.avatar_filename).to be_nil
      expect(storage.children).to be_empty
    end
  end

  describe "DELETE /api/v1/characters/:id/avatar" do
    it "removes the avatar for the owner" do
      sign_in_as(owner)
      upload
      filename = character.reload.avatar_filename

      delete "/api/v1/characters/#{character.id}/avatar"
      expect(response).to have_http_status(:no_content)
      expect(character.reload.avatar_filename).to be_nil
      expect(storage.join(filename)).not_to exist
    end

    it "forbids other users" do
      sign_in_as(owner)
      upload
      sign_in_as(create(:user))

      delete "/api/v1/characters/#{character.id}/avatar"
      expect(response).to have_http_status(:forbidden)
      expect(character.reload.avatar_filename).to be_present
    end
  end

  describe "GET /api/v1/characters/:id/avatar/:filename" do
    let(:party) { create(:party) }
    let(:url) { "/api/v1/characters/#{character.id}/avatar/#{character.reload.avatar_filename}" }

    before do
      sign_in_as(owner)
      upload
    end

    it "lets accepted party companions and the party leader view it" do
      create(:party_membership, party: party, character: character)
      companion = create(:user)
      create(:party_membership, party: party, character: create(:character, user: companion))

      [ companion, party.leader ].each do |viewer|
        sign_in_as(viewer)
        get url
        expect(response).to have_http_status(:ok)
      end
    end

    it "lets the leader view a pending request's avatar" do
      create(:party_membership, :pending, party: party, character: character)
      sign_in_as(party.leader)
      get url
      expect(response).to have_http_status(:ok)
    end

    it "forbids unrelated users and pending companions" do
      create(:party_membership, party: party, character: character)
      pending_user = create(:user)
      create(:party_membership, :pending, party: party, character: create(:character, user: pending_user))

      [ create(:user), pending_user ].each do |viewer|
        sign_in_as(viewer)
        get url
        expect(response).to have_http_status(:forbidden)
      end
    end

    it "requires authentication" do
      delete "/api/v1/session", headers: json_headers
      get url
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 404 for stale or malformed filenames" do
      get "/api/v1/characters/#{character.id}/avatar/#{'a' * 32}"
      expect(response).to have_http_status(:not_found)
      get "/api/v1/characters/#{character.id}/avatar/..%2Fsecret"
      expect(response).to have_http_status(:not_found)
    end
  end

  it "deletes the avatar file when the character is deleted" do
    sign_in_as(owner)
    upload
    filename = character.reload.avatar_filename

    delete "/api/v1/characters/#{character.id}", headers: json_headers
    expect(response).to have_http_status(:no_content)
    expect(storage.join(filename)).not_to exist
  end
end
