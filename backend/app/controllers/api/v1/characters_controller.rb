module Api
  module V1
    class CharactersController < ApplicationController
      def index
        characters = Current.user.characters.order(updated_at: :desc, id: :desc)
        render json: {
          characters: characters.map do |character|
            character_payload(character).merge(origin_name: character.origin&.name)
          end
        }
      end

      def create
        character = Current.user.characters.new
        authorize character, :create?
        save_character(character, require_hindrance_balance: true)
      end

      def show
        character = Character.find(character_id)
        authorize character, :show?
        render json: { character: character_payload(character).merge(origin_name: character.origin&.name) }
      end

      def destroy
        character = Character.find(character_id)
        authorize character, :destroy?
        character.destroy!
        head :no_content
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
          attributes: {},
          skill_dice: {},
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
          skill_ids: character.skill_ids,
          attributes: character.attribute_dice,
          skill_dice: character.character_skills.each_with_object({}) do |selection, dice|
            dice[selection.skill_id] = selection.die
          end,
          effective_traits: Characters::EffectiveTraits.new(character).as_json
        }
      end
    end
  end
end
