class CharacterDraftPolicy < ApplicationPolicy
  def index?
    user.present?
  end

  def create?
    user.present?
  end

  def show?
    user.present? && record.user_id == user.id
  end

  alias update? show?
  alias destroy? show?

  class Scope < Scope
    def resolve
      return scope.none if user.nil?

      scope.where(user_id: user.id)
    end
  end
end
