module BattleHelpers
  class ScriptedRng
    def initialize(values)
      @values = values.dup
    end

    def rand(range)
      raise "ScriptedRng ran out of values" if @values.empty?

      value = @values.shift
      if range.is_a?(Range) && !range.cover?(value)
        raise ArgumentError, "scripted value #{value} is outside #{range}"
      end

      value
    end
  end

  def battle_definition(id, side: "party", **overrides)
    {
      "id" => id,
      "name" => id.to_s.titleize,
      "side" => side,
      "wild_card" => side == "party",
      "attributes" => { "agility" => "d6", "smarts" => "d6", "spirit" => "d6", "strength" => "d6", "vigor" => "d6" },
      "skills" => { "fighting" => "d6" },
      "pace" => 6,
      "parry" => 5,
      "toughness" => 5,
      "armor" => 0,
      "bennies" => 0,
      "weapons" => [ { "name" => "Sword", "damage" => "Str+d8" } ]
    }.merge(overrides.deep_stringify_keys)
  end

  def build_engine(definitions, seed: 1, **settings)
    Battles::Engine.new(definitions: definitions, settings: settings, seed: seed)
  end

  def script_dice(engine, *values)
    engine.instance_variable_set(:@dice, Battles::Dice.new(ScriptedRng.new(values.flatten)))
  end
end

RSpec.configure do |config|
  config.include BattleHelpers
end
