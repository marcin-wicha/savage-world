require "rails_helper"

RSpec.describe Battles::TraitDie do
  it "parses dice with and without modifiers" do
    expect(described_class.parse("d8")).to have_attributes(sides: 8, modifier: 0)
    expect(described_class.parse("d12+2")).to have_attributes(sides: 12, modifier: 2)
    expect(described_class.parse("d6-1")).to have_attributes(sides: 6, modifier: -1)
    expect(described_class.parse("d7")).to be_nil
    expect(described_class.parse(nil)).to be_nil
  end

  it "steps dice up and down, adding modifiers past d12" do
    expect(described_class.parse("d6").step(1).to_s).to eq("d8")
    expect(described_class.parse("d12").step(2).to_s).to eq("d12+2")
    expect(described_class.parse("d4").step(-1).to_s).to eq("d4")
  end
end
