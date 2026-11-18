require "rails_helper"

RSpec.describe "Battles", type: :request do
  let(:leader) { create(:user, password: "password123") }
  let(:party) { create(:party, leader: leader) }
  let!(:hero) do
    create(:character, user: leader, name: "Hero", attribute_dice: { "agility" => "d8", "smarts" => "d6", "spirit" => "d6", "strength" => "d8", "vigor" => "d8" }).tap do |character|
      create(:party_membership, party: party, character: character)
      sword = create(:gear, name: "Sword", category: "melee_weapon", effects: { "damage" => "Str+d8" })
      create(:character_gear, character: character, gear: sword, equipped: true)
    end
  end
  let(:template) { create(:enemy_template, user: leader, name: "Goblin") }

  def create_battle(attributes = {}, party_id: party.id, **keywords)
    post "/api/v1/parties/#{party_id}/battles", params: { battle: attributes.merge(keywords) }.to_json, headers: json_headers
  end

  describe "as the party leader" do
    before { sign_in_as(leader) }

    it "simulates and stores a battle" do
      create_battle(enemies: [ { enemy_template_id: template.id, count: 3 } ], runs: 10, seed: 42, settings: { starting_distance: 8, morale: true })

      expect(response).to have_http_status(:created)
      battle = json["battle"]
      expect(battle).to include("runs" => 10, "seed" => 42, "created_by_me" => true, "can_delete" => true)
      expect(battle["settings"]).to include("starting_distance" => 8, "morale" => true)
      expect(battle["roster"].pluck("name")).to eq([ "Hero", "Goblin 1", "Goblin 2", "Goblin 3" ])
      expect(battle["roster"].first["weapons"].first).to include("name" => "Sword", "skill" => "fighting")
      expect(battle.dig("summary", "runs")).to eq(10)
      expect(battle.dig("summary", "wins").values.sum + battle.dig("summary", "draws")).to eq(10)
      expect(battle["log"].first["type"]).to eq("battle_start")
      expect(battle["log"].last["type"]).to eq("battle_end")
      expect(Battle.last).to have_attributes(party: party, user: leader, seed: 42)
    end

    it "returns every run's outcome and replays any run's full log" do
      create_battle(enemies: [ { enemy_template_id: template.id, count: 3 } ], runs: 12, seed: 7)
      battle = json["battle"]
      results = battle["run_results"]

      expect(results.pluck("index")).to eq((0...12).to_a)
      expect(results.count { |run| run["winner"] == "party" }).to eq(battle.dig("summary", "wins", "party"))
      expect(results.count { |run| run["winner"] == "draw" }).to eq(battle.dig("summary", "draws"))
      expect(battle["summary"]).not_to have_key("run_results")

      get "/api/v1/battles/#{battle['id']}/runs/0", headers: json_headers
      expect(response).to have_http_status(:ok)
      expect(json["run"]).to include("index" => 0, "winner" => results[0]["winner"], "rounds" => results[0]["rounds"])
      expect(json.dig("run", "log")).to eq(battle["log"])

      longest = results.max_by { |run| run["rounds"] }
      get "/api/v1/battles/#{battle['id']}/runs/#{longest['index']}", headers: json_headers
      expect(json.dig("run", "rounds")).to eq(longest["rounds"])
      expect(json.dig("run", "log").pluck("round").max).to eq(longest["rounds"])
      expect(json.dig("run", "log").last).to include("type" => "battle_end", "winner" => longest["winner"])
    end

    it "replays run results for battles recorded before they were stored" do
      create_battle(enemies: [ { enemy_template_id: template.id, count: 2 } ], runs: 6, seed: 3)
      expected = json.dig("battle", "run_results")
      battle = Battle.find(json.dig("battle", "id"))
      battle.update!(summary: battle.summary.except("run_results"))

      get "/api/v1/battles/#{battle.id}", headers: json_headers

      expect(json.dig("battle", "run_results")).to eq(expected)
    end

    it "returns not found for runs outside the battle" do
      create_battle(enemies: [ { enemy_template_id: template.id } ], runs: 3)
      id = json.dig("battle", "id")

      [ 3, -1, "first" ].each do |index|
        get "/api/v1/battles/#{id}/runs/#{index}", headers: json_headers
        expect(response).to have_http_status(:not_found)
      end
    end

    it "is reproducible with the same seed" do
      create_battle(enemies: [ { enemy_template_id: template.id, count: 2 } ], runs: 5, seed: 9)
      first = json.dig("battle", "summary")
      create_battle(enemies: [ { enemy_template_id: template.id, count: 2 } ], runs: 5, seed: 9)

      expect(json.dig("battle", "summary")).to eq(first)
    end

    it "lists the party's battles without logs" do
      create(:battle, party: party, user: leader)

      get "/api/v1/parties/#{party.id}/battles", headers: json_headers

      expect(response).to have_http_status(:ok)
      expect(json["battles"].length).to eq(1)
      expect(json["battles"].first).not_to have_key("log")
    end

    it "shows and deletes a battle" do
      battle = create(:battle, party: party, user: leader)

      get "/api/v1/battles/#{battle.id}", headers: json_headers
      expect(response).to have_http_status(:ok)
      expect(json["battle"]).to include("id" => battle.id, "log" => [])

      delete "/api/v1/battles/#{battle.id}", headers: json_headers
      expect(response).to have_http_status(:no_content)
      expect(Battle.exists?(battle.id)).to be(false)
    end

    it "rejects invalid input" do
      create_battle(enemies: [], runs: 0, settings: { cover: "castle" })

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["details"].keys).to include("enemies", "runs", "settings")
    end

    it "rejects unknown templates and oversized battles" do
      create_battle(enemies: [ { enemy_template_id: 999_999, count: 1 } ])
      expect(response).to have_http_status(:unprocessable_content)

      other = create(:enemy_template, user: leader)
      create_battle(enemies: [ { enemy_template_id: template.id, count: 20 }, { enemy_template_id: other.id, count: 20 } ])
      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("details", "enemies")).to eq([ "cannot bring the battle above 30 combatants" ])
    end

    it "leaves dead characters out of the fight" do
      hero.update!(status: :dead)

      create_battle(enemies: [ { enemy_template_id: template.id } ])

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("details", "party")).to eq([ "has no accepted living characters" ])
    end

    it "requires accepted characters" do
      empty_party = create(:party, leader: leader)

      create_battle({ enemies: [ { enemy_template_id: template.id } ] }, party_id: empty_party.id)

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("details", "party")).to eq([ "has no accepted living characters" ])
    end

    it "lets the party use shared bestiary entries" do
      shared = create(:enemy_template, source_key: "goblin", name: "Bestiary Goblin")

      create_battle(enemies: [ { enemy_template_id: shared.id } ], runs: 1)

      expect(response).to have_http_status(:created)
      expect(json.dig("battle", "roster").pluck("name")).to include("Bestiary Goblin")
    end

    it "forbids someone else's enemy templates" do
      foreign = create(:enemy_template)

      create_battle(enemies: [ { enemy_template_id: foreign.id } ])

      expect(response).to have_http_status(:forbidden)
      expect(Battle.count).to eq(0)
    end

    it "returns not found for a missing party" do
      create_battle({ enemies: [ { enemy_template_id: template.id } ] }, party_id: 999_999)

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "as an accepted participant" do
    let(:participant) { create(:user, password: "password123") }

    before do
      create(:party_membership, party: party, character: create(:character, user: participant))
      sign_in_as(participant)
    end

    it "can run a battle with their own templates but cannot delete the leader's battles" do
      own_template = create(:enemy_template, user: participant)
      create_battle(enemies: [ { enemy_template_id: own_template.id } ], runs: 1)
      expect(response).to have_http_status(:created)

      battle = create(:battle, party: party, user: leader)
      get "/api/v1/battles/#{battle.id}", headers: json_headers
      expect(json.dig("battle", "can_delete")).to be(false)

      delete "/api/v1/battles/#{battle.id}", headers: json_headers
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "as a stranger" do
    let(:stranger) { create(:user, password: "password123") }

    before { sign_in_as(stranger) }

    it "cannot list, view, or start battles" do
      battle = create(:battle, party: party, user: leader)

      get "/api/v1/parties/#{party.id}/battles", headers: json_headers
      expect(response).to have_http_status(:forbidden)

      get "/api/v1/battles/#{battle.id}", headers: json_headers
      expect(response).to have_http_status(:forbidden)

      get "/api/v1/battles/#{battle.id}/runs/0", headers: json_headers
      expect(response).to have_http_status(:forbidden)

      create_battle(enemies: [ { enemy_template_id: create(:enemy_template, user: stranger).id } ])
      expect(response).to have_http_status(:forbidden)
    end
  end

  it "requires authentication" do
    get "/api/v1/parties/#{party.id}/battles", headers: json_headers
    expect(response).to have_http_status(:unauthorized)

    get "/api/v1/battles/#{create(:battle, party: party).id}/runs/0", headers: json_headers
    expect(response).to have_http_status(:unauthorized)
  end
end
