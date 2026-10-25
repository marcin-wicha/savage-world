class CharacterPolicy < ApplicationPolicy
  def upsert?
    user.present? && record.user_id == user.id
  end

  alias create? upsert?
  alias update? upsert?
  alias show? upsert?
  alias destroy? upsert?
end
