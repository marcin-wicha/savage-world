module Parties
  class Join
    attr_reader :membership, :errors

    def initialize(party:, character:, user:)
      @party = party
      @character = character
      @user = user
      @errors = {}
    end

    def call
      if (message = PartyMembership.join_error_for(@character))
        @errors = { character_id: [ message ] }
        return false
      end

      if @party.party_memberships.exists?(character_id: @character.id)
        @errors = { character_id: [ "is already in this party or awaiting approval" ] }
        return false
      end

      status = @party.leader?(@user) ? :accepted : :pending
      @membership = @party.party_memberships.create!(character: @character, status: status)
      true
    rescue ActiveRecord::RecordInvalid, ActiveRecord::RecordNotUnique
      @errors = { character_id: [ "is already in this party or awaiting approval" ] }
      false
    end
  end
end
