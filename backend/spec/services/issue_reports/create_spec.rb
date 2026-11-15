require "rails_helper"

RSpec.describe IssueReports::Create do
  let(:user) { create(:user) }
  let(:client) { instance_double(IssueReports::GithubClient) }
  let(:params) do
    {
      title: "  Skill dice   reset ",
      description: "Clicking back resets my skills.",
      page_url: "/characters/new",
      language: "pl",
      viewport: "1280x720",
      user_agent: "Browser `1.0` | test"
    }
  end

  it "creates a GitHub issue with the report and context" do
    allow(client).to receive(:create_issue).and_return(number: 7, url: "https://github.com/o/r/issues/7")

    result = described_class.new(user: user, params: params, client: client).call

    expect(result).to be_success
    expect(result.issue).to eq(number: 7, url: "https://github.com/o/r/issues/7")
    expect(client).to have_received(:create_issue) do |title:, body:|
      expect(title).to eq("[User report] Skill dice reset")
      expect(body).to include("Clicking back resets my skills.")
      expect(body).to include("| Page | `/characters/new` |")
      expect(body).to include("| User agent | `Browser 1.0 test` |")
      expect(body).to include("user ##{user.id}")
      expect(body).not_to include(user.email_address)
    end
  end

  it "rejects blank and oversized input without calling GitHub" do
    allow(client).to receive(:create_issue)

    result = described_class.new(
      user: user,
      params: { title: "x" * 121, description: " " },
      client: client
    ).call

    expect(result).not_to be_success
    expect(result.errors.keys).to contain_exactly(:title, :description)
    expect(client).not_to have_received(:create_issue)
  end
end
