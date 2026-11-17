require "rails_helper"

RSpec.describe Battles::Dice do
  def dice(*values)
    described_class.new(BattleHelpers::ScriptedRng.new(values))
  end

  let(:d8) { Battles::TraitDie.new(8) }

  it "aces when the maximum is rolled" do
    expect(dice(6, 6, 2).exploding(6)).to eq([ 6, 6, 2 ])
  end

  it "uses the Wild Die when it beats the trait die" do
    roll = dice(3, 6, 4).trait(d8, wild_card: true, modifier: 1)

    expect(roll.trait_rolls).to eq([ [ 3 ] ])
    expect(roll.wild_rolls).to eq([ 6, 4 ])
    expect(roll.best).to eq(11)
    expect(roll.critical_failure).to be(false)
  end

  it "applies the trait die modifier" do
    roll = dice(5).trait(Battles::TraitDie.parse("d12+2"), wild_card: false)

    expect(roll.best).to eq(7)
  end

  it "flags a Wild Card critical failure on double ones" do
    expect(dice(1, 1).trait(d8, wild_card: true).critical_failure).to be(true)
    expect(dice(1, 2).trait(d8, wild_card: true).critical_failure).to be(false)
  end

  it "confirms an Extra's critical failure with a d6" do
    expect(dice(1, 1).trait(d8, wild_card: false).critical_failure).to be(true)
    expect(dice(1, 3).trait(d8, wild_card: false).critical_failure).to be(false)
  end

  it "rolls one trait die per rate of fire and replaces the lowest with the Wild Die" do
    roll = dice(7, 2, 5).trait(d8, wild_card: true, count: 2)

    expect(roll.totals).to eq([ 7, 5 ])
  end

  it "rolls exploding damage dice" do
    roll = dice(8, 3, 4).damage([ 8, 6 ], modifier: 1)

    expect(roll.total).to eq(16)
    expect(roll.rolls).to eq([ { die: "d8", rolls: [ 8, 3 ] }, { die: "d6", rolls: [ 4 ] } ])
  end

  it "classifies outcomes and raises" do
    expect(described_class.outcome(3, 4)).to eq(:failure)
    expect(described_class.outcome(7, 4)).to eq(:success)
    expect(described_class.outcome(8, 4)).to eq(:raise)
    expect(described_class.raises(12, 4)).to eq(2)
  end
end
