module Api
  module V1
    class PartyMembershipsController < ApplicationController
      include PartyPayloads

      def create
        party = Party.find(params[:party_id])
        character = Character.find(params.require(:character_id))
        authorize party.party_memberships.new(character: character), :add?

        join = Parties::Join.new(party: party, character: character, user: Current.user)
        if join.call
          render json: { membership: membership_payload(join.membership) }, status: :created
        else
          render json: { error: "Validation failed", details: join.errors }, status: :unprocessable_content
        end
      end

      def accept
        membership = find_membership
        authorize membership
        membership.accepted!
        render json: { membership: membership_payload(membership) }
      end

      def destroy
        membership = find_membership
        authorize membership
        membership.destroy!
        head :no_content
      end

      private

      def find_membership
        PartyMembership.includes(:party, character: :origin).find_by!(id: params[:id], party_id: params[:party_id])
      end
    end
  end
end
