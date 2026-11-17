module Api
  module V1
    class BattlesController < ApplicationController
      def index
        party = Party.find(params[:party_id])
        authorize party, :show?
        battles = party.battles.order(created_at: :desc, id: :desc).limit(50)
        render json: { battles: battles.map { |battle| summary_payload(battle) } }
      end

      def show
        battle = Battle.includes(:party).find(params[:id])
        authorize battle
        render json: { battle: detail_payload(battle) }
      end

      def create
        party = Party.find(params[:party_id])
        authorize Battle.new(party: party, user: Current.user)

        creator = Battles::Create.new(user: Current.user, party: party, params: battle_params)
        if creator.call
          render json: { battle: detail_payload(creator.battle) }, status: :created
        elsif creator.forbidden?
          render json: { error: "Forbidden", details: creator.errors }, status: :forbidden
        else
          render json: { error: "Validation failed", details: creator.errors }, status: :unprocessable_content
        end
      end

      def destroy
        battle = Battle.includes(:party).find(params[:id])
        authorize battle
        battle.destroy!
        head :no_content
      end

      private

      def battle_params
        params.require(:battle).permit(:runs, :seed, enemies: %i[enemy_template_id count], settings: {}).to_h
      end

      def summary_payload(battle)
        {
          id: battle.id,
          party_id: battle.party_id,
          created_at: battle.created_at,
          created_by_me: battle.user_id == Current.user.id,
          runs: battle.runs,
          seed: battle.seed,
          settings: battle.settings,
          roster: battle.roster.map { |combatant| roster_entry(combatant) },
          summary: battle.summary
        }
      end

      def detail_payload(battle)
        summary_payload(battle).merge(
          can_delete: policy(battle).destroy?,
          log: battle.log,
          final_state: battle.final_state
        )
      end

      def roster_entry(combatant)
        combatant.slice("id", "name", "side", "wild_card", "attributes", "skills", "pace", "parry", "toughness", "armor", "size", "bennies", "edges", "abilities")
          .merge(
            "toughness" => combatant["toughness"].to_i + combatant["armor"].to_i,
            "weapons" => Array(combatant["weapons"]).map { |weapon| Gears::CombatProfile.new(weapon).as_json }
          )
      end
    end
  end
end
