module PartyPayloads
  extend ActiveSupport::Concern

  private

  def party_summary_payload(party)
    my_statuses = party.party_memberships.select { |membership| membership.character.user_id == Current.user.id }.map(&:status)
    led_by_me = party.leader?(Current.user)
    accepted = party.party_memberships.select(&:accepted?).sort_by(&:id)
    {
      id: party.id,
      name: party.name,
      description: party.description,
      led_by_me: led_by_me,
      member_count: accepted.size,
      member_characters: led_by_me || my_statuses.include?("accepted") ? accepted.map { |membership| character_summary(membership.character) } : [],
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
      character: character_summary(character).merge(
        rank: character.rank,
        origin_name: character.origin && ReferenceData::Translations.for(character.origin, :name, locale: requested_locale)
      )
    }
  end

  def character_summary(character)
    { id: character.id, name: character.name, avatar_url: Characters::AvatarUpload.url(character) }
  end

  def party_memberships_preload
    { party_memberships: { character: :origin } }
  end
end
