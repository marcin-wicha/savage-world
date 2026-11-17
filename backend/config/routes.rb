Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resource :session, only: %i[show create destroy]
      resources :registrations, only: :create
      resources :issue_reports, only: :create
      get "admin/users", to: "admin/users#index"
      patch "admin/users/:id/approve", to: "admin/users#approve"

      get "characters", to: "characters#index", as: :characters_index
      post "characters", to: "characters#create", as: :characters
      get "characters/:id", to: "characters#show", as: :character_show
      put "characters/:id", to: "characters#upsert", as: :character
      delete "characters/:id", to: "characters#destroy", as: :character_destroy
      post "characters/:character_id/avatar", to: "character_avatars#create", as: :character_avatar
      delete "characters/:character_id/avatar", to: "character_avatars#destroy"
      get "characters/:character_id/avatar/:filename", to: "character_avatars#show", format: false

      resources :parties, only: %i[index show create update destroy] do
        post :invite_code, on: :member, action: :regenerate_invite_code
        resources :memberships, controller: :party_memberships, only: :destroy do
          patch :accept, on: :member
        end
        resources :battles, only: %i[index create]
      end
      resources :battles, only: %i[show destroy]
      resources :enemy_templates, only: %i[index show create update destroy]
      get "party_invites/:code", to: "party_invites#show", as: :party_invite
      post "party_invites/:code/memberships", to: "party_invites#join", as: :party_invite_memberships
      get "artwork/:resource/:id/:filename", to: "artwork#show", format: false
      post "admin/:resource/:id/artwork", to: "admin/artwork#create"
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
