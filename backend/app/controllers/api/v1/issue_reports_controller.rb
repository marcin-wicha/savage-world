module Api
  module V1
    class IssueReportsController < ApplicationController
      rate_limit to: 5, within: 10.minutes, only: :create, by: -> { Current.user&.id || request.remote_ip }, with: -> {
        render json: { error: "Too many requests" }, status: :too_many_requests
      }

      def create
        result = IssueReports::Create.new(user: Current.user, params: report_params).call

        if result.success?
          render json: { issue: result.issue }, status: :created
        else
          render json: { error: "Validation failed", details: result.errors }, status: :unprocessable_content
        end
      rescue IssueReports::GithubClient::NotConfigured
        render json: { error: "Issue reporting is not configured" }, status: :service_unavailable
      rescue IssueReports::GithubClient::RequestFailed => error
        Rails.logger.error("Issue report failed: #{error.message}")
        render json: { error: "Could not create the issue" }, status: :bad_gateway
      end

      private

      def report_params
        params.require(:issue_report).permit(:title, :description, :page_url, :language, :viewport, :user_agent)
      end
    end
  end
end
