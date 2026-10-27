require "rails_helper"

RSpec.describe "db/seeds.rb" do
  it "creates an idempotent default admin login" do
    seeds = Rails.root.join("db/seeds.rb")

    expect { load seeds }.to change(User, :count).by(1)

    admin = User.find_by!(email_address: "admin")
    expect(admin.authenticate("admin")).to eq(admin)

    expect { load seeds }.not_to change(User, :count)
  end

  it "removes the retired reference data" do
    Edge.create!(
      name: "Retired",
      slug: "silent-caster",
      category: "power",
      minimum_rank: "novice",
      source_book: "SWADE",
      source_page: 1
    )
    Hindrance.create!(name: "Retired", slug: "corruption", severity: "major", source_book: "SWADE", source_page: 1)

    load Rails.root.join("db/seeds.rb")

    expect(Edge.where(slug: %w[
      silent-caster home-ground fey-blood arcane-resistance improved-arcane-resistance
      arcane-background-cleric arcane-background-diabolist arcane-background-illusionist
      arcane-background-necromancer arcane-background-summoner
    ])).to be_empty
    expect(Hindrance.where(slug: %w[arcane-sensitivity material-components corruption])).to be_empty
  end
end
