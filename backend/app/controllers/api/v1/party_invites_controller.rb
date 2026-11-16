module Api
  module V1
    class PartyInvitesController < ApplicationController
      include PartyPayloads

      def show
        party = find_party
        my_memberships = party.party_memberships.select { |membership| membership.character.user_id == Current.user.id }
        render json: {
          party: party.slice(:id, :name, :description).merge(
            member_count: party.party_memberships.count(&:accepted?),
            led_by_me: party.leader?(Current.user)
          ),
          my_memberships: my_memberships.map { |membership| { character_id: membership.character_id, status: membership.status } }
        }
      end

      def join
        party = find_party
        character = Character.find(params.require(:character_id))
        authorize party.party_memberships.new(character: character), :create?

        join = Parties::Join.new(party: party, character: character, user: Current.user)
        if join.call
          render json: { membership: membership_payload(join.membership) }, status: :created
        else
          render json: { error: "Validation failed", details: join.errors }, status: :unprocessable_content
        end
      end

      private

      def find_party
        Party.includes(party_memberships_preload).find_by!(invite_code: params[:code].to_s)
      end
    end
  end
end
