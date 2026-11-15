require "rails_helper"

RSpec.describe "Issue reports", type: :request do
  let(:user) { create(:user, password: "password123") }
  let(:client) { instance_double(IssueReports::GithubClient) }
  let(:report) { { title: "Broken button", description: "It does nothing.", page_url: "/characters/new" } }

  before { allow(IssueReports::GithubClient).to receive(:from_env).and_return(client) }

  def sign_in(user)
    get "/api/v1/session", headers: json_headers
    post "/api/v1/session",
      params: { email_address: user.email_address, password: "password123" }.to_json,
      headers: json_headers(csrf_token: response.cookies["XSRF-TOKEN"])
  end

  def post_report(attributes = report)
    post "/api/v1/issue_reports", params: { issue_report: attributes }.to_json, headers: json_headers
  end

  it "requires authentication" do
    post_report

    expect(response).to have_http_status(:unauthorized)
  end

  context "when signed in" do
    before { sign_in(user) }

    it "creates a GitHub issue" do
      allow(client).to receive(:create_issue).and_return(number: 3, url: "https://github.com/o/r/issues/3")

      post_report

      expect(response).to have_http_status(:created)
      expect(json).to eq("issue" => { "number" => 3, "url" => "https://github.com/o/r/issues/3" })
    end

    it "returns validation errors" do
      post_report(title: "", description: "")

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["details"].keys).to contain_exactly("title", "description")
    end

    it "reports when GitHub is not configured" do
      allow(client).to receive(:create_issue).and_raise(IssueReports::GithubClient::NotConfigured)

      post_report

      expect(response).to have_http_status(:service_unavailable)
    end

    it "reports when GitHub rejects the issue" do
      allow(client).to receive(:create_issue).and_raise(IssueReports::GithubClient::RequestFailed, "500")

      post_report

      expect(response).to have_http_status(:bad_gateway)
      expect(json).to eq("error" => "Could not create the issue")
    end
  end
end
