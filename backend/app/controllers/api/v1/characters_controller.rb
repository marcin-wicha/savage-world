module Api
  module V1
    class CharactersController < ApplicationController
      def create
        character = Current.user.characters.new
        authorize character, :create?
        save_character(character, require_hindrance_balance: true)
      end

      def upsert
        character = Character.find_by(id: character_id)
        character ||= Current.user.characters.new(id: character_id)
        authorize character
        save_character(character, require_hindrance_balance: false)
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

      def save_character(character, require_hindrance_balance:)
        upserter = Characters::Upserter.new(
          character: character,
          attributes: character_params,
          require_hindrance_balance: require_hindrance_balance
        )
        if upserter.call
          render json: { character: character_payload(upserter.character) },
            status: upserter.created? ? :created : :ok
        else
          render json: { error: "Validation failed", details: upserter.errors },
            status: :unprocessable_content
        end
      end

      def character_params
        params.require(:character).permit(
          :name,
          :rank,
          :origin_id,
          :hindrance_points_earned,
          :hindrance_points_spent,
          edge_ids: [],
          hindrance_ids: [],
          skill_ids: [],
          hindrance_severities: {}
        ).to_h.symbolize_keys
      end

      def character_payload(character)
        {
          id: character.id,
          name: character.name,
          rank: character.rank,
          origin_id: character.origin_id,
          edge_ids: character.edge_ids,
          hindrance_ids: character.hindrance_ids,
          skill_ids: character.skill_ids
        }
      end
    end
  end
end
