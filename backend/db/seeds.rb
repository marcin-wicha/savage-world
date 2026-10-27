Origins::Importer.new.call
Edges::Importer.new.call
Hindrances::Importer.new.call
Skills::Importer.new.call
Gears::Importer.new.call
Powers::Importer.new.call

Edge.where(slug: %w[
  silent-caster home-ground fey-blood arcane-resistance improved-arcane-resistance
  arcane-background-cleric arcane-background-diabolist arcane-background-illusionist
  arcane-background-necromancer arcane-background-summoner
]).destroy_all
Hindrance.where(slug: %w[arcane-sensitivity material-components corruption]).destroy_all

admin = User.find_or_initialize_by(email_address: "admin")
admin.password = "admin"
admin.password_confirmation = "admin"
admin.role = :admin
admin.save!
