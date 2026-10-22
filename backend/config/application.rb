require_relative "boot"

require "rails/all"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module SavageWorlds
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.1

    # API-only application: no server-rendered views or asset pipeline.
    config.api_only = true
    config.active_storage.variant_processor = :disabled

    # API-only apps omit cookie and session middleware by default. Session
    # cookies are required for browser authentication.
    config.middleware.use ActionDispatch::Cookies
    config.middleware.use ActionDispatch::Session::CookieStore,
      key: "_savage_worlds_session",
      httponly: true,
      same_site: :lax,
      secure: Rails.env.production?

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    config.autoload_lib(ignore: %w[assets tasks])

    config.generators do |g|
      g.test_framework :rspec
      g.fixture_replacement :factory_bot, dir: "spec/factories"
      g.helper false
      g.assets false
      g.system_tests false
    end
  end
end
