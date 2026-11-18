module Api
  module V1
    class CharactersController < ApplicationController
      def index
        characters = Current.user.characters.includes(:origin, :edges, character_hindrances: :hindrance, character_skills: :skill, character_gears: :gear).order(updated_at: :desc, id: :desc)
        render json: {
          characters: characters.map do |character|
            character_payload(character)
          end
        }
      end

      def create
        character = Current.user.characters.new(status: :draft)
        authorize character, :create?
        save_character(character)
      end

      def finalize
        character = Character.find(character_id)
        authorize character, :update?
        unless character.draft?
          return render json: { error: "Validation failed", details: { status: [ "is already finalized" ] } },
            status: :unprocessable_content
        end

        save_character(character, finalize: true)
      end

      def show
        character = Character.find(character_id)
        authorize character, :show?
        render json: { character: character_payload(character) }
      end

      def destroy
        character = Character.find(character_id)
        authorize character, :destroy?
        character.destroy!
        Characters::AvatarUpload.delete_file(character.avatar_filename)
        head :no_content
      end

      def upsert
        character = Character.find_by(id: character_id)
        character ||= Current.user.characters.new(id: character_id, status: :draft)
        authorize character
        save_character(character)
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

      def save_character(character, finalize: false)
        upserter = Characters::Upserter.new(
          character: character,
          attributes: finalize ? finalize_params : character_params,
          finalize: finalize
        )
        if upserter.call
          render json: { character: character_payload(upserter.character) },
            status: upserter.created? ? :created : :ok
        else
          render json: { error: "Validation failed", details: upserter.errors },
            status: :unprocessable_content
        end
      end

      def finalize_params
        params[:character].present? ? character_params : {}
      end

      def character_params
        params.require(:character).permit(
          :name,
          :rank,
          :concept,
          :creation_step,
          :status,
          :origin_id,
          :hindrance_points_earned,
          :hindrance_points_spent,
          edge_ids: [],
          hindrance_ids: [],
          skill_ids: [],
          equipped_gear_ids: [],
          gear: {},
          attributes: {},
          skill_dice: {},
          hindrance_severities: {}
        ).to_h.symbolize_keys
      end

      def character_payload(character)
        effective_traits = Characters::EffectiveTraits.new(character).as_json
        {
          id: character.id,
          name: character.name,
          status: character.status,
          concept: character.concept,
          creation_step: character.creation_step,
          updated_at: character.updated_at,
          avatar_url: Characters::AvatarUpload.url(character),
          origin_name: character.origin && ReferenceData::Translations.for(
            character.origin,
            :name,
            locale: requested_locale
          ),
          rank: character.rank,
          origin_id: character.origin_id,
          edge_ids: character.edge_ids,
          edges: character.edges.map { |edge| { id: edge.id, name: edge.name, slug: edge.slug } },
          hindrance_ids: character.hindrance_ids,
          hindrances: character.hindrances.map { |hindrance| { id: hindrance.id, name: hindrance.name, slug: hindrance.slug } },
          hindrance_severities: character.character_hindrances.each_with_object({}) do |selection, severities|
            severities[selection.hindrance_id] = selection.effective_severity
          end,
          skill_ids: character.skill_ids,
          skills: character.character_skills.map do |selection|
            {
              id: selection.skill_id,
              name: selection.skill.name,
              slug: selection.skill.slug,
              attribute: selection.skill.linked_attribute,
              die: selection.die
            }
          end,
          creation_points: Characters::CreationPoints.new(character).as_json,
          attributes: character.attribute_dice,
          skill_dice: character.character_skills.each_with_object({}) do |selection, dice|
            dice[selection.skill_id] = selection.die
          end,
          gear: character.character_gears.sort_by(&:gear_id).map do |selection|
            profile = selection.combat_profile
            {
              gear_id: selection.gear_id,
              name: selection.gear.name,
              category: selection.gear.category,
              quantity: selection.quantity,
              equipped: selection.equipped,
              combat: profile.combat? ? profile.as_json : nil
            }
          end,
          effective_traits: effective_traits,
          derived: Characters::DerivedStats.new(character, effective_traits: effective_traits).as_json
        }
      end
    end
  end
end
