require "rails_helper"
require "yaml"

RSpec.describe "SWADE edge seed data" do
  let(:path) { Rails.root.join("db/data/edges/swade.yml") }
  let(:document) { YAML.safe_load_file(path, permitted_classes: [], aliases: false) }
  let(:edges) { document.fetch("edges") }

  def find_edge(slug)
    edges.find { |edge| edge["slug"] == slug }
  end

  def edge_references(requirements)
    Array(requirements).flat_map do |clause|
      next [] unless clause.is_a?(Hash)

      case clause["kind"]
      when "edge" then [ clause["slug"] ]
      when "any" then edge_references(clause["clauses"])
      else []
      end
    end
  end

  it "contains 131 unique edges" do
    expect(edges.size).to eq(131)
    expect(edges.map { |edge| edge["slug"] }.uniq.size).to eq(131)
  end

  it "contains only valid edges" do
    edges.each do |attributes|
      edge = Edge.new(attributes)
      expect(edge).to be_valid, "#{attributes['name']}: #{edge.errors.full_messages.to_sentence}"
    end
  end

  it "preserves the core category counts" do
    expect(edges.map { |edge| edge["category"] }.tally).to eq(
      "combat" => 44,
      "background" => 22,
      "power" => 14,
      "social" => 14,
      "professional" => 12,
      "legendary" => 9,
      "weird" => 8,
      "leadership" => 8
    )
  end

  it "marks the known repeatable edges" do
    expect(edges.select { |edge| edge["repeatable"] }.map { |edge| edge["slug"] }).to contain_exactly(
      "new-powers",
      "power-points",
      "trademark-weapon"
    )
  end

  it "resolves all edge requirements within the data set" do
    known_slugs = edges.map { |edge| edge["slug"] }
    references = edges.flat_map { |edge| edge_references(edge["requirements"]) }.uniq

    expect(references - known_slugs).to be_empty
  end

  it "contains the known requirement corrections" do
    expect(find_edge("acrobat")["requirements"]).to include(
      { "kind" => "attribute", "attribute" => "agility", "die" => 8 }
    )
    expect(find_edge("assassin")["requirements"]).to include(
      { "kind" => "attribute", "attribute" => "agility", "die" => 8 }
    )
  end

  it "models Dead Shot and Menacing alternatives as any clauses" do
    expect(find_edge("dead-shot")["requirements"]).to include(
      {
        "kind" => "any",
        "clauses" => [
          { "kind" => "skill", "skill" => "athletics", "die" => 8 },
          { "kind" => "skill", "skill" => "shooting", "die" => 8 }
        ]
      }
    )
    expect(find_edge("menacing")["requirements"]).to include(
      {
        "kind" => "any",
        "clauses" => [
          { "kind" => "hindrance", "slug" => "bloodthirsty" },
          { "kind" => "hindrance", "slug" => "mean" },
          { "kind" => "hindrance", "slug" => "ruthless" },
          { "kind" => "hindrance", "slug" => "ugly" }
        ]
      }
    )
  end

  it "does not commit rulebook prose" do
    expect(edges.flat_map(&:keys)).not_to include("description", "summary")
  end
end
