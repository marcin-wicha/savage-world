module Api
  module V1
    class ArtworkController < ApplicationController
      allow_unauthenticated_access

      def show
        record = ReferenceData::ArtworkUpload.resource(params[:resource], params[:id])
        filename = params[:filename]
        path = ReferenceData::ArtworkUpload.path(filename)
        expected_url = "/api/v1/artwork/#{params[:resource]}/#{record.id}/#{filename}"
        raise ActiveRecord::RecordNotFound unless record.artwork_url == expected_url && path.file?

        response.headers["X-Content-Type-Options"] = "nosniff"
        bytes = path.binread
        content_type = ReferenceData::ArtworkUpload::FORMATS.find { |_type, (_, matches)| matches.call(bytes) }&.first
        raise ActiveRecord::RecordNotFound unless content_type

        send_data bytes, type: content_type, disposition: :inline
      end
    end
  end
end
