Origins::Importer.new.call
Edges::Importer.new.call
Hindrances::Importer.new.call
Skills::Importer.new.call
Gears::Importer.new.call

admin = User.find_or_initialize_by(email_address: "admin")
admin.password = "admin"
admin.password_confirmation = "admin"
admin.save!
