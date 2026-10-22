require "rails_helper"

RSpec.describe "db/seeds.rb" do
  it "creates an idempotent default admin login" do
    seeds = Rails.root.join("db/seeds.rb")

    expect { load seeds }.to change(User, :count).by(1)

    admin = User.find_by!(email_address: "admin")
    expect(admin.authenticate("admin")).to eq(admin)

    expect { load seeds }.not_to change(User, :count)
  end
end
