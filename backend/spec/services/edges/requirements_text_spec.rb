require "rails_helper"

RSpec.describe Edges::RequirementsText do
  def edge(minimum_rank: "novice", requirements: [])
    Edge.new(minimum_rank: minimum_rank, requirements: requirements)
  end

  it "renders attribute and skill dice" do
    text = described_class.new(
      edge(
        requirements: [
          { "kind" => "attribute", "attribute" => "agility", "die" => 8 },
          { "kind" => "skill", "skill" => "fighting", "die" => 6 }
        ]
      )
    ).to_s

    expect(text).to eq("Novice, Agility d8+, Fighting d6+")
  end

  it "renders an edge with its display name and a detail" do
    text = described_class.new(
      edge(
        requirements: [
          {
            "kind" => "edge",
            "slug" => "professional",
            "name" => "Professional",
            "detail" => "in affected Trait"
          }
        ]
      )
    ).to_s

    expect(text).to eq("Novice, Professional in affected Trait")
  end

  it "preserves the display name of edge references" do
    text = described_class.new(
      edge(requirements: [ { "kind" => "edge", "slug" => "hard-to-kill", "name" => "Hard to Kill" } ])
    ).to_s

    expect(text).to eq("Novice, Hard to Kill")
  end

  it "renders a hindrance with a detail" do
    text = described_class.new(
      edge(requirements: [ { "kind" => "hindrance", "slug" => "mean", "detail" => "Major" } ])
    ).to_s

    expect(text).to eq("Novice, Mean (Major)")
  end

  it "renders arcane backgrounds and special requirements" do
    text = described_class.new(
      edge(
        requirements: [
          { "kind" => "arcane_background", "value" => "weird-science" },
          { "kind" => "special", "text" => "arcane skill d10+" }
        ]
      )
    ).to_s

    expect(text).to eq("Novice, Arcane Background (Weird Science), arcane skill d10+")
  end

  it "joins three or more alternatives with a serial comma" do
    text = described_class.new(
      edge(
        requirements: [
          {
            "kind" => "any",
            "clauses" => [
              { "kind" => "hindrance", "slug" => "bloodthirsty" },
              { "kind" => "hindrance", "slug" => "mean" },
              { "kind" => "hindrance", "slug" => "ugly" }
            ]
          }
        ]
      )
    ).to_s

    expect(text).to eq("Novice, Bloodthirsty, Mean, or Ugly")
  end

  it "returns an empty string when there is no rank or requirements" do
    expect(described_class.new(edge(minimum_rank: nil)).to_s).to eq("")
  end
end
