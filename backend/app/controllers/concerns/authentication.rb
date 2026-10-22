module Authentication
  extend ActiveSupport::Concern

  AUTH_HINT_COOKIE = :sw_authenticated

  included do
    before_action :require_authentication
    after_action :sync_authentication_hint
    helper_method :authenticated?
  end

  class_methods do
    def allow_unauthenticated_access(**options)
      skip_before_action :require_authentication, **options
    end
  end

  private

  # UI hint only; authorization still uses the HttpOnly session cookie.
  def sync_authentication_hint
    if authenticated?
      return if cookies[AUTH_HINT_COOKIE] == "1"

      cookies.permanent[AUTH_HINT_COOKIE] = {
        value: "1",
        httponly: false,
        same_site: :lax,
        secure: Rails.env.production?,
        path: "/"
      }
    elsif cookies[AUTH_HINT_COOKIE].present?
      cookies.delete(AUTH_HINT_COOKIE, path: "/", same_site: :lax, secure: Rails.env.production?)
    end
  end

  def authenticated?
    resume_session.present?
  end

  def require_authentication
    resume_session || request_authentication
  end

  def resume_session
    Current.session ||= find_session_by_cookie
  end

  def find_session_by_cookie
    Session.find_by(id: cookies.signed[:session_id]) if cookies.signed[:session_id]
  end

  def request_authentication
    render json: { error: "Authentication required" }, status: :unauthorized
  end

  def start_new_session_for(user)
    reset_session

    user.sessions.create!(user_agent: request.user_agent, ip_address: request.remote_ip).tap do |session|
      Current.session = session
      cookies.signed.permanent[:session_id] = {
        value: session.id,
        httponly: true,
        same_site: :lax,
        secure: Rails.env.production?
      }
    end
  end

  def terminate_session
    Current.session&.destroy
    cookies.delete(:session_id, same_site: :lax, secure: Rails.env.production?)
    reset_session
    Current.session = nil
  end
end
