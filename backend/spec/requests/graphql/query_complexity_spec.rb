require "rails_helper"

RSpec.describe "GraphQL frontend query complexity", type: :request do
  FRONTEND_OPERATIONS = {
    "edges.graphql" => { "first" => 14 },
    "skills.graphql" => { "first" => 25 }
  }.freeze

  FRONTEND_OPERATIONS.each do |filename, variables|
    it "keeps #{filename} within the schema complexity limit" do
      query = File.read(Rails.root.join("../frontend/src/graphql/operations", filename))
      [ variables, {} ].each do |request_variables|
        result = SavageWorldsSchema.execute(query, variables: request_variables)

        expect(result.to_h["errors"]).to be_nil, result.to_h.fetch("errors", []).inspect
      end
    end
  end
end
