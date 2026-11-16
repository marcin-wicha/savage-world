module Api
  module V1
    class PartiesController < ApplicationController
      include PartyPayloads

      def index
        parties = policy_scope(Party).includes(party_memberships_preload).order(updated_at: :desc, id: :desc)
        render json: { parties: parties.map { |party| party_summary_payload(party) } }
      end

      def show
        party = find_party
        authorize party
        render json: { party: party_detail_payload(party) }
      end

      def create
        party = Party.new(leader: Current.user, **party_params.slice(:name, :description))
        authorize party
        if party.save
          render json: { party: party_detail_payload(party) }, status: :created
        else
          render_validation_errors(party.errors.to_hash)
        end
      end

      def update
        party = find_party
        authorize party
        party.assign_attributes(party_params.slice(:name, :description))

        if party_params.key?(:leader_id)
          transfer = Parties::TransferLeadership.new(party: party, new_leader_id: party_params[:leader_id])
          return render_validation_errors(transfer.errors) unless transfer.call
        end

        if party.save
          render json: { party: party_detail_payload(party.reload) }
        else
          render_validation_errors(party.errors.to_hash)
        end
      end

      def destroy
        party = find_party
        authorize party
        party.destroy!
        head :no_content
      end

      def regenerate_invite_code
        party = find_party
        authorize party
        party.regenerate_invite_code
        render json: { party: party_detail_payload(party) }
      end

      private

      def find_party
        Party.includes(party_memberships_preload).find(params[:id])
      end

      def party_params
        params.require(:party).permit(:name, :description, :leader_id).to_h.symbolize_keys
      end

      def render_validation_errors(details)
        render json: { error: "Validation failed", details: details }, status: :unprocessable_content
      end
    end
  end
end
