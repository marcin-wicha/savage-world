require "rails_helper"

RSpec.describe Battles::Settings do
  it "fills in defaults" do
    settings = described_class.new

    expect(settings).to be_valid
    expect(settings.to_h).to eq(
      "starting_distance" => 12, "illumination" => "bright", "cover" => "none", "max_rounds" => 20, "morale" => false
    )
  end

  it "casts and exposes modifiers" do
    settings = described_class.new("starting_distance" => "24", "illumination" => "dark", "cover" => "light", "morale" => "true")

    expect(settings).to be_valid
    expect(settings["starting_distance"]).to eq(24)
    expect(settings["morale"]).to be(true)
    expect(settings.illumination_modifier).to eq(-4)
    expect(settings.cover_modifier).to eq(-2)
  end

  it "rejects invalid values and unknown keys" do
    settings = described_class.new("starting_distance" => 0, "max_rounds" => 99, "illumination" => "neon", "cover" => "x", "speed" => 1)

    expect(settings).not_to be_valid
    expect(settings.errors).to include(
      "unknown settings: speed",
      "starting_distance must be between 1 and 60",
      "max_rounds must be between 1 and 30",
      "illumination must be one of bright, dim, dark, pitch_dark",
      "cover must be one of none, light, medium, heavy"
    )
  end
end
