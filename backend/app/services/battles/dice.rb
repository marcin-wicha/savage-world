module Battles
  class Dice
    MAX_EXPLOSIONS = 20

    TraitRoll = Struct.new(:die, :count, :modifier, :trait_rolls, :wild_rolls, :totals, :critical_failure, keyword_init: true) do
      def best
        totals.max
      end

      def natural_ones
        trait_rolls.count { |rolls| rolls.first == 1 }
      end

      def as_json(*)
        {
          die: die.to_s,
          modifier: modifier,
          trait: trait_rolls,
          wild: wild_rolls,
          totals: totals,
          critical_failure: critical_failure
        }
      end
    end

    DamageRoll = Struct.new(:rolls, :modifier, :total, keyword_init: true) do
      def as_json(*)
        { rolls: rolls, modifier: modifier, total: total }
      end
    end

    def self.outcome(total, target)
      return :failure if total < target

      raises = (total - target) / 4
      raises.zero? ? :success : :raise
    end

    def self.raises(total, target)
      total < target ? -1 : (total - target) / 4
    end

    def initialize(rng)
      @rng = rng
    end

    def roll(sides)
      @rng.rand(1..sides)
    end

    def exploding(sides)
      rolls = [ roll(sides) ]
      while rolls.last == sides && rolls.length <= MAX_EXPLOSIONS
        rolls << roll(sides)
      end
      rolls
    end

    def trait(die, wild_card:, modifier: 0, count: 1)
      trait_rolls = Array.new(count) { exploding(die.sides) }
      wild_rolls = wild_card ? exploding(6) : nil
      bonus = die.modifier + modifier
      totals = trait_rolls.map { |rolls| rolls.sum + bonus }

      if wild_rolls
        wild_total = wild_rolls.sum + bonus
        lowest = totals.each_with_index.min_by(&:first)
        totals[lowest.last] = wild_total if wild_total > lowest.first
      end

      ones = trait_rolls.count { |rolls| rolls.first == 1 }
      critical_failure =
        if wild_rolls
          wild_rolls.first == 1 && ones * 2 >= count
        else
          ones * 2 >= count && roll(6) == 1
        end

      TraitRoll.new(
        die: die,
        count: count,
        modifier: bonus,
        trait_rolls: trait_rolls,
        wild_rolls: wild_rolls,
        totals: totals.sort.reverse,
        critical_failure: critical_failure
      )
    end

    def damage(dice, modifier: 0)
      rolls = dice.map { |sides| { die: "d#{sides}", rolls: exploding(sides) } }
      total = rolls.sum { |roll| roll[:rolls].sum } + modifier
      DamageRoll.new(rolls: rolls, modifier: modifier, total: total)
    end
  end
end
