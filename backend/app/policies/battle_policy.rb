class BattlePolicy < ApplicationPolicy
  def create?
    PartyPolicy.new(user, record.party).show?
  end

  alias show? create?

  def destroy?
    user.present? && (record.user_id == user.id || record.party.leader?(user))
  end
end
