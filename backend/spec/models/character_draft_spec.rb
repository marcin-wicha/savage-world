require "rails_helper"

RSpec.describe CharacterDraft do
  it { is_expected.to belong_to(:user) }

  it "is valid with an object snapshot and a step" do
    expect(build(:character_draft)).to be_valid
  end

  it "rejects non-object data" do
    draft = build(:character_draft, data: [ "not", "an", "object" ])

    expect(draft).not_to be_valid
    expect(draft.errors[:data]).to include("must be an object")
  end

  it "rejects oversized data" do
    draft = build(:character_draft, data: { "notes" => "x" * (CharacterDraft::MAX_DATA_BYTES + 1) })

    expect(draft).not_to be_valid
    expect(draft.errors[:data]).to include("is too large")
  end

  it "bounds the step" do
    expect(build(:character_draft, step: -1)).not_to be_valid
    expect(build(:character_draft, step: CharacterDraft::MAX_STEP + 1)).not_to be_valid
    expect(build(:character_draft, step: 1.5)).not_to be_valid
  end

  it "limits how many drafts a user keeps" do
    user = create(:user)
    create_list(:character_draft, CharacterDraft::MAX_PER_USER, user: user)

    draft = build(:character_draft, user: user)

    expect(draft).not_to be_valid
    expect(draft.errors[:base].first).to match(/at most 20 drafts/)
  end

  it "derives a display name from the concept" do
    expect(build(:character_draft, data: { "concept" => { "name" => "  Mira  " } }).name).to eq("Mira")
    expect(build(:character_draft, data: { "concept" => "Mira" }).name).to eq("")
    expect(build(:character_draft, data: {}).name).to eq("")
  end
end
