require "fileutils"
require "securerandom"

module Characters
  class AvatarUpload
    FORMATS = ReferenceData::ArtworkUpload::FORMATS
    MAX_BYTES = ReferenceData::ArtworkUpload::MAX_BYTES
    FILENAME = ReferenceData::ArtworkUpload::FILENAME

    class InvalidFile < StandardError; end

    def self.directory
      Rails.root.join("storage", "avatars")
    end

    def self.path(filename)
      raise ActiveRecord::RecordNotFound unless FILENAME.match?(filename.to_s)

      directory.join(filename)
    end

    def self.url(character)
      return if character.avatar_filename.blank?

      "/api/v1/characters/#{character.id}/avatar/#{character.avatar_filename}"
    end

    def self.content_type(bytes)
      FORMATS.find { |_type, (_, matches)| matches.call(bytes) }&.first
    end

    def self.remove(character)
      filename = character.avatar_filename
      character.update!(avatar_filename: nil) unless character.destroyed?
      delete_file(filename)
    end

    def self.delete_file(filename)
      return if filename.blank?

      path = path(filename)
      File.delete(path) if path.file?
    end

    def initialize(character, file)
      @character = character
      @file = file
    end

    def call
      raise InvalidFile, "An image file is required" unless @file.is_a?(ActionDispatch::Http::UploadedFile)

      format = FORMATS[@file.content_type]
      raise InvalidFile, "Supported formats: PNG, JPEG, GIF, WebP" unless format

      bytes = @file.tempfile.read(MAX_BYTES + 1).to_s
      raise InvalidFile, "Image must be between 1 byte and 5 MB" if bytes.empty? || bytes.bytesize > MAX_BYTES
      raise InvalidFile, "Image content does not match its type" unless format.last.call(bytes)

      previous = @character.avatar_filename
      filename = SecureRandom.hex(16)
      path = self.class.path(filename)
      FileUtils.mkdir_p(path.dirname)
      File.open(path, File::WRONLY | File::CREAT | File::EXCL, 0o644) do |output|
        created = true
        output.binmode
        output.write(bytes)
      end

      @character.update!(avatar_filename: filename)
      self.class.delete_file(previous)
      self.class.url(@character)
    rescue StandardError
      File.delete(path) if defined?(created) && created && File.exist?(path)
      raise
    end
  end
end
