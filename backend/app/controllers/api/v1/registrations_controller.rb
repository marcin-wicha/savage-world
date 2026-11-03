module Api
  module V1
    class RegistrationsController < ApplicationController
      allow_unauthenticated_access only: :create

      def create
        user = User.new(params.require(:user).permit(:email_address, :password, :password_confirmation))

        user.valid?
        user.errors.add(:password_confirmation, :blank) if user.password_confirmation.blank?

        if user.errors.empty? && user.save
          render json: { message: "Registration pending approval" }, status: :created
        else
          render json: { error: "Validation failed", details: user.errors.to_hash }, status: :unprocessable_content
        end
      end
    end
  end
end
