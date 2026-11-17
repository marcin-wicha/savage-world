class CharacterPolicy < ApplicationPolicy
  def upsert?
    user.present? && record.user_id == user.id
  end

  alias create? upsert?
  alias update? upsert?
  alias show? upsert?
  alias destroy? upsert?
  alias update_avatar? upsert?

  def view_avatar?
    return false if user.nil?
    return true if upsert?

    memberships = PartyMembership.where(character_id: record.id)
    return true if memberships.where(party_id: Party.where(leader_id: user.id).select(:id)).exists?

    my_party_ids = PartyMembership.accepted.joins(:character).where(characters: { user_id: user.id }).select(:party_id)
    memberships.accepted.where(party_id: my_party_ids).exists?
  end
end
