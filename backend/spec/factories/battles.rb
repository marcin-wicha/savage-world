FactoryBot.define do
  factory :battle do
    association :party
    user { party.leader }
    seed { 1 }
    runs { 1 }
    settings { Battles::Settings.new.to_h }
    roster { [] }
    summary { { "runs" => 1 } }
    log { [] }
    final_state { [] }
  end
end
