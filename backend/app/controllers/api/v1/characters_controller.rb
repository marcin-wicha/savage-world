module Api
  module V1
    class CharactersController < ApplicationController
      def upsert
        character = Character.find_by(id: character_id)
        character ||= Current.user.characters.new(id: character_id)
        authorize character

        upserter = Characters::Upserter.new(character: character, attributes: character_params)
        if upserter.call
          render json: { character: character_payload(upserter.character) },
            status: upserter.created? ? :created : :ok
        else
          render json: { error: "Validation failed", details: upserter.errors },
            status: :unprocessable_content
        end
      end

      private

      def character_id
        @character_id ||= begin
          id = Integer(params[:id], 10)
          raise ActiveRecord::RecordNotFound unless id.positive?

          id
        rescue ArgumentError
          raise ActiveRecord::RecordNotFound
        end
      end

      def character_params
        params.require(:character).permit(
          :name,
          :rank,
          edge_ids: [],
          hindrance_ids: [],
          skill_ids: []
        ).to_h.symbolize_keys
      end

      def character_payload(character)
        {
          id: character.id,
          name: character.name,
          rank: character.rank,
          edge_ids: character.edge_ids,
          hindrance_ids: character.hindrance_ids,
          skill_ids: character.skill_ids
        }
      end
    end
  end
end
