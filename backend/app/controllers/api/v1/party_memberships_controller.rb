module Api
  module V1
    class PartyMembershipsController < ApplicationController
      include PartyPayloads

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
