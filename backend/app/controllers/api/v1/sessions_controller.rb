module Api
  module V1
    class SessionsController < ApplicationController
      allow_unauthenticated_access only: %i[show create]

      rate_limit to: 10, within: 3.minutes, only: :create, with: -> {
        render json: { error: "Too many requests" }, status: :too_many_requests
      }

      def show
        resume_session
        render json: { user: user_payload(Current.user), csrf_token: form_authenticity_token }
      end

      def create
        user = User.authenticate_by(params.permit(:email_address, :password))

        if user
          start_new_session_for(user)
          render json: { user: user_payload(user) }, status: :created
        else
          render json: { error: "Invalid email address or password" }, status: :unauthorized
        end
      end

      def destroy
        terminate_session
        head :no_content
      end

      private

      def user_payload(user)
        return nil unless user

        { id: user.id, email_address: user.email_address, role: user.role }
      end
    end
  end
end
