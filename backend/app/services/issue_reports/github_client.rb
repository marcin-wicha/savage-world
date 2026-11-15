require "net/http"

module IssueReports
  class GithubClient
    class NotConfigured < StandardError; end
    class RequestFailed < StandardError; end

    API_HOST = "api.github.com".freeze

    def self.from_env(env = ENV)
      new(
        token: env["GITHUB_ISSUES_TOKEN"],
        repository: env.fetch("GITHUB_ISSUES_REPOSITORY", "marcin-wicha/savage-world"),
        labels: env.fetch("GITHUB_ISSUES_LABELS", "bug").split(",").map(&:strip).reject(&:empty?)
      )
    end

    def initialize(token:, repository:, labels: [])
      @token = token
      @repository = repository
      @labels = labels
    end

    def configured?
      @token.present? && @repository.present?
    end

    def create_issue(title:, body:)
      raise NotConfigured, "GitHub issue reporting is not configured" unless configured?

      response = Net::HTTP.start(API_HOST, 443, use_ssl: true, open_timeout: 5, read_timeout: 10) do |http|
        http.request(build_request(title, body))
      end

      unless response.is_a?(Net::HTTPSuccess)
        raise RequestFailed, "GitHub responded with #{response.code}"
      end

      payload = JSON.parse(response.body)
      { number: payload.fetch("number"), url: payload.fetch("html_url") }
    rescue SocketError, SystemCallError, Timeout::Error, OpenSSL::SSL::SSLError, JSON::ParserError, KeyError => error
      raise RequestFailed, error.message
    end

    private

    def build_request(title, body)
      request = Net::HTTP::Post.new("/repos/#{@repository}/issues")
      request["Accept"] = "application/vnd.github+json"
      request["Authorization"] = "Bearer #{@token}"
      request["X-GitHub-Api-Version"] = "2022-11-28"
      request["Content-Type"] = "application/json"
      request["User-Agent"] = "savage-worlds-builder"
      request.body = { title: title, body: body, labels: @labels }.to_json
      request
    end
  end
end
