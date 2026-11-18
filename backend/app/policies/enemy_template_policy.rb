class EnemyTemplatePolicy < ApplicationPolicy
  def index?
    user.present?
  end

  def create?
    user.present?
  end

  def show?
    user.present? && (owner? || record.source_key.present?)
  end

  def update?
    owner? && record.source_key.nil?
  end

  alias destroy? update?

  private

  def owner?
    user.present? && record.user_id == user.id
  end

  class Scope < Scope
    def resolve
      return scope.none if user.nil?

      scope.where(user_id: user.id).or(scope.where.not(source_key: nil))
    end
  end
end
