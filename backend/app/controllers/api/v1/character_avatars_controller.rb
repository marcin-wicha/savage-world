module Api
  module V1
    class CharacterAvatarsController < ApplicationController
      def show
        character = Character.find(params[:character_id])
        authorize character, :view_avatar?
        raise ActiveRecord::RecordNotFound unless character.avatar_filename == params[:filename]

        path = Characters::AvatarUpload.path(params[:filename])
        raise ActiveRecord::RecordNotFound unless path.file?

        bytes = path.binread
        content_type = Characters::AvatarUpload.content_type(bytes)
        raise ActiveRecord::RecordNotFound unless content_type

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Cache-Control"] = "private, max-age=31536000, immutable"
        send_data bytes, type: content_type, disposition: :inline
      end

      def create
        character = Character.find(params[:character_id])
        authorize character, :update_avatar?
        url = Characters::AvatarUpload.new(character, params[:file]).call
        render json: { avatar_url: url }, status: :ok
      rescue Characters::AvatarUpload::InvalidFile => error
        render json: { error: error.message }, status: :unprocessable_content
      end

      def destroy
        character = Character.find(params[:character_id])
        authorize character, :update_avatar?
        Characters::AvatarUpload.remove(character)
        head :no_content
      end
    end
  end
end
