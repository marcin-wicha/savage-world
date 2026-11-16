module Parties
  class TransferLeadership
    attr_reader :errors

    def initialize(party:, new_leader_id:)
      @party = party
      @new_leader_id = new_leader_id
      @errors = {}
    end

    def call
      new_leader_id = Integer(@new_leader_id.to_s, 10, exception: false)
      if new_leader_id == @party.leader_id
        @errors = { leader_id: [ "is already the party leader" ] }
      elsif new_leader_id.nil? || !@party.member_owner?(new_leader_id)
        @errors = { leader_id: [ "must own an accepted character in the party" ] }
      else
        @party.leader_id = new_leader_id
      end

      errors.empty?
    end
  end
end
