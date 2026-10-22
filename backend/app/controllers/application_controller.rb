class ApplicationController < ActionController::API
  include ActionController::Cookies
  include ActionController::RequestForgeryProtection
  include Pundit::Authorization
  include Authentication

  protect_from_forgery with: :exception

  after_action :set_csrf_cookie

  rescue_from ActionController::InvalidAuthenticityToken, with: :invalid_csrf
  rescue_from ActionController::ParameterMissing, with: :invalid_request
  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  rescue_from Pundit::NotAuthorizedError, with: :forbidden

  private

  def pundit_user
    Current.user
  end

  def set_csrf_cookie
    cookies["XSRF-TOKEN"] = {
      value: form_authenticity_token,
      httponly: false,
      same_site: :lax,
      secure: Rails.env.production?
    }
  end

  def invalid_csrf
    render json: { error: "Invalid authenticity token" }, status: :unprocessable_content
  end

  def invalid_request
    render json: { error: "Invalid request" }, status: :unprocessable_content
  end

  def not_found
    render json: { error: "Not found" }, status: :not_found
  end

  def forbidden
    render json: { error: "Forbidden" }, status: :forbidden
  end
end
