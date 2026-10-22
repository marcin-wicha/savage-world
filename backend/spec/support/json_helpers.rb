module JsonHelpers
  def json
    JSON.parse(response.body)
  end

  def json_headers(csrf_token: nil)
    headers = {
      "ACCEPT" => "application/json",
      "CONTENT_TYPE" => "application/json"
    }
    headers["X-CSRF-Token"] = csrf_token if csrf_token
    headers
  end
end

RSpec.configure do |config|
  config.include JsonHelpers, type: :request
end
