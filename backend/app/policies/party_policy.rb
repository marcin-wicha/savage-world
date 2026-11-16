class PartyPolicy < ApplicationPolicy
  def create?
    user.present?
  end

  def show?
    record.leader?(user) || record.participant?(user)
  end

  def update?
    record.leader?(user)
  end

  alias destroy? update?
  alias regenerate_invite_code? update?
  alias manage_members? update?

  class Scope < Scope
    def resolve
      return scope.none if user.nil?

      member_party_ids = PartyMembership.joins(:character).where(characters: { user_id: user.id }).select(:party_id)
      scope.where(leader_id: user.id).or(scope.where(id: member_party_ids))
    end
  end
end
