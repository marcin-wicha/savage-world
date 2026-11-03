module Api
  module V1
    module Admin
      class ArtworkController < ApplicationController
        before_action :authorize_admin

        def create
          record = ReferenceData::ArtworkUpload.resource(params[:resource], params[:id])
          url = ReferenceData::ArtworkUpload.new(record, params[:file]).call
          render json: { artwork_url: url }, status: :ok
        rescue ReferenceData::ArtworkUpload::InvalidFile => error
          render json: { error: error.message }, status: :unprocessable_content
        end

        private

        def authorize_admin
          authorize :admin, :manage?
        end
      end
    end
  end
end
