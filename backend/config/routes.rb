Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resource :session, only: %i[show create destroy]
      post "characters", to: "characters#create", as: :characters
      put "characters/:id", to: "characters#upsert", as: :character
    end
  end

  post "/graphql", to: "graphql#execute"

  get "up" => "rails/health#show", as: :rails_health_check
end
