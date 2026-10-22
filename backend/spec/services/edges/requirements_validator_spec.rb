require "rails_helper"

RSpec.describe Edges::RequirementsValidator do
  it "accepts a valid requirement tree" do
    requirements = [
      { "kind" => "wild_card" },
      { "kind" => "attribute", "attribute" => "agility", "die" => 8 },
      { "kind" => "skill", "skill" => "fighting", "die" => 6 },
      {
        "kind" => "edge",
        "slug" => "professional",
        "name" => "Professional",
        "detail" => "in affected Trait"
      },
      { "kind" => "hindrance", "slug" => "mean" },
      { "kind" => "arcane_background", "value" => "any" },
      { "kind" => "special", "text" => "See text" },
      {
        "kind" => "any",
        "clauses" => [
          { "kind" => "skill", "skill" => "athletics", "die" => 8 },
          { "kind" => "attribute", "attribute" => "strength", "die" => 6 }
        ]
      }
    ]

    expect(described_class.new(requirements).errors).to be_empty
  end

  it "requires an array" do
    expect(described_class.new(nil).errors).to eq([ "must be an array" ])
  end

  it "rejects non-object clauses" do
    expect(described_class.new([ "wild_card" ]).errors).to eq([ "clause 0 must be an object" ])
  end

  it "rejects unknown kinds and keys" do
    requirements = [ { "kind" => "attribute", "attribute" => "agility", "die" => 8, "extra" => true } ]

    expect(described_class.new(requirements).errors).to include(
      "clause 0 has unknown keys: extra"
    )

    requirements = [ { "kind" => "mystery" } ]

    expect(described_class.new(requirements).errors).to eq([ "clause 0 must have a valid kind" ])
  end

  it "rejects empty any clauses" do
    requirements = [ { "kind" => "any", "clauses" => [] } ]

    expect(described_class.new(requirements).errors).to eq(
      [ "clause 0.clauses must be a non-empty array" ]
    )
  end

  it "validates nested any clauses" do
    requirements = [
      {
        "kind" => "any",
        "clauses" => [
          { "kind" => "skill", "skill" => "athletics", "die" => 99 }
        ]
      }
    ]

    expect(described_class.new(requirements).errors).to eq(
      [ "clause 0.clauses[0].die must be one of: 4, 6, 8, 10, 12" ]
    )
  end

  it "rejects malformed slugs, names, and details" do
    requirements = [
      { "kind" => "edge", "slug" => "Not A Slug", "name" => "" },
      { "kind" => "hindrance", "slug" => "mean", "detail" => "" }
    ]

    expect(described_class.new(requirements).errors).to eq(
      [
        "clause 0.slug must be a lowercase slug",
        "clause 0.name must be a non-empty string",
        "clause 1.detail must be a non-empty string"
      ]
    )
  end
end
