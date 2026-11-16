module PartyPayloads
  extend ActiveSupport::Concern

  private

  def party_summary_payload(party)
    my_statuses = party.party_memberships.select { |membership| membership.character.user_id == Current.user.id }.map(&:status)
    {
      id: party.id,
      name: party.name,
      description: party.description,
      led_by_me: party.leader?(Current.user),
      member_count: party.party_memberships.count(&:accepted?),
      my_status: my_statuses.include?("accepted") ? "accepted" : my_statuses.first
    }
  end

  def party_detail_payload(party)
    leader = party.leader?(Current.user)
    memberships = party.party_memberships.sort_by(&:id)
    memberships = memberships.select(&:accepted?) unless leader

    payload = party_summary_payload(party).merge(
      members: memberships.map { |membership| membership_payload(membership) }
    )
    payload[:invite_code] = party.invite_code if leader
    payload
  end

  def membership_payload(membership)
    character = membership.character
    {
      membership_id: membership.id,
      status: membership.status,
      owned_by_me: character.user_id == Current.user.id,
      owner_id: character.user_id,
      character: {
        id: character.id,
        name: character.name,
        rank: character.rank,
        origin_name: character.origin && ReferenceData::Translations.for(character.origin, :name, locale: requested_locale)
      }
    }
  end

  def party_memberships_preload
    { party_memberships: { character: :origin } }
  end
end
