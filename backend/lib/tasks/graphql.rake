namespace :graphql do
  namespace :schema do
    desc "Dump the GraphQL schema to schema.graphql"
    task dump: :environment do
      path = Rails.root.join("schema.graphql")
      File.write(path, SavageWorldsSchema.to_definition)
      puts "Schema dumped to #{path}"
    end
  end
end
