module SessionHelpers
  def sign_in_as(user, password: "password123")
    delete "/api/v1/session", headers: json_headers if cookies[:session_id].present?
    get "/api/v1/session", headers: json_headers
    post "/api/v1/session",
      params: { email_address: user.email_address, password: password }.to_json,
      headers: json_headers(csrf_token: response.cookies["XSRF-TOKEN"])

    expect(response).to have_http_status(:created)
  end
end

RSpec.configure do |config|
  config.include SessionHelpers, type: :request
end
