Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resource :session, only: %i[show create destroy]
      get "characters", to: "characters#index", as: :characters_index
      post "characters", to: "characters#create", as: :characters
      get "characters/:id", to: "characters#show", as: :character_show
      put "characters/:id", to: "characters#upsert", as: :character
      delete "characters/:id", to: "characters#destroy", as: :character_destroy
      get "admin/reference_data", to: "admin/reference_data#index"
      get "admin/:resource", to: "admin/reference_data#show"
      post "admin/:resource", to: "admin/reference_data#create"
      patch "admin/:resource/:id", to: "admin/reference_data#update"
      delete "admin/:resource/:id", to: "admin/reference_data#destroy"
    end
  end

  post "/graphql", to: "graphql#execute"

  get "up" => "rails/health#show", as: :rails_health_check
end
