require "rails_helper"

RSpec.describe IssueReports::GithubClient do
  subject(:client) { described_class.new(token: "secret", repository: "owner/repo", labels: [ "bug" ]) }

  let(:http) { instance_double(Net::HTTP) }

  before { allow(Net::HTTP).to receive(:start).with("api.github.com", 443, hash_including(use_ssl: true)).and_yield(http) }

  it "posts the issue to the repository and returns its number and URL" do
    response = Net::HTTPCreated.new("1.1", "201", "Created")
    allow(response).to receive(:body).and_return({ number: 12, html_url: "https://github.com/owner/repo/issues/12" }.to_json)
    allow(http).to receive(:request).and_return(response)

    expect(client.create_issue(title: "T", body: "B")).to eq(number: 12, url: "https://github.com/owner/repo/issues/12")
    expect(http).to have_received(:request) do |request|
      expect(request.path).to eq("/repos/owner/repo/issues")
      expect(request["Authorization"]).to eq("Bearer secret")
      expect(JSON.parse(request.body)).to eq("title" => "T", "body" => "B", "labels" => [ "bug" ])
    end
  end

  it "raises when GitHub rejects the request" do
    allow(http).to receive(:request).and_return(Net::HTTPUnauthorized.new("1.1", "401", "Unauthorized"))

    expect { client.create_issue(title: "T", body: "B") }.to raise_error(described_class::RequestFailed, /401/)
  end

  it "raises when no token is configured" do
    unconfigured = described_class.from_env({})

    expect(unconfigured).not_to be_configured
    expect { unconfigured.create_issue(title: "T", body: "B") }.to raise_error(described_class::NotConfigured)
  end

  it "reads the repository and labels from the environment" do
    configured = described_class.from_env(
      "GITHUB_ISSUES_TOKEN" => "t", "GITHUB_ISSUES_REPOSITORY" => "a/b", "GITHUB_ISSUES_LABELS" => "bug, feedback"
    )

    expect(configured).to be_configured
    expect(configured.instance_variable_get(:@labels)).to eq([ "bug", "feedback" ])
  end
end
