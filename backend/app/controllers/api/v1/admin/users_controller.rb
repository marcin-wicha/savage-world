module Api
  module V1
    module Admin
      class UsersController < ApplicationController
        before_action :authorize_admin

        def index
          render json: { users: User.pending.order(:id).map { |user| user_payload(user) } }
        end

        def approve
          user = User.find(params[:id])
          if user.approved?
            render json: { error: "User is already approved" }, status: :unprocessable_content
          else
            user.update!(approved: true)
            render json: { user: user_payload(user) }
          end
        end

        private

        def authorize_admin
          authorize :admin, :manage?
        end

        def user_payload(user)
          { id: user.id, email_address: user.email_address, role: user.role }
        end
      end
    end
  end
end
