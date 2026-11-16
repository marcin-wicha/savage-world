class PartyMembershipPolicy < ApplicationPolicy
  def create?
    user.present? && record.character&.user_id == user.id
  end

  def accept?
    record.party.leader?(user)
  end

  def destroy?
    accept? || (user.present? && record.character.user_id == user.id)
  end
end
