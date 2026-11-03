require "fileutils"
require "securerandom"

module ReferenceData
  class ArtworkUpload
    RESOURCES = {
      "origins" => Origin,
      "hindrances" => Hindrance,
      "edges" => Edge,
      "skills" => Skill,
      "gears" => Gear
    }.freeze
    MAX_BYTES = 5.megabytes
    FORMATS = {
      "image/png" => [ "png", ->(bytes) { bytes.start_with?("\x89PNG\r\n\x1a\n".b) } ],
      "image/jpeg" => [ "jpg", ->(bytes) { bytes.start_with?("\xff\xd8\xff".b) } ],
      "image/gif" => [ "gif", ->(bytes) { bytes.start_with?("GIF87a".b, "GIF89a".b) } ],
      "image/webp" => [ "webp", ->(bytes) { bytes.start_with?("RIFF".b) && bytes.byteslice(8, 4) == "WEBP" } ]
    }.freeze
    FILENAME = /\A[0-9a-f]{32}\z/

    class InvalidFile < StandardError; end

    def self.resource(resource, id)
      RESOURCES.fetch(resource) { raise ActiveRecord::RecordNotFound }.find(id)
    end

    def self.path(filename)
      raise ActiveRecord::RecordNotFound unless FILENAME.match?(filename)

      Rails.root.join("storage", "artwork", filename)
    end

    def initialize(record, file)
      @record = record
      @file = file
    end

    def call
      raise InvalidFile, "An image file is required" unless @file.is_a?(ActionDispatch::Http::UploadedFile)

      format = FORMATS[@file.content_type]
      raise InvalidFile, "Supported formats: PNG, JPEG, GIF, WebP" unless format

      bytes = @file.tempfile.read(MAX_BYTES + 1)
      raise InvalidFile, "Image must be between 1 byte and 5 MB" if bytes.empty? || bytes.bytesize > MAX_BYTES
      raise InvalidFile, "Image content does not match its type" unless format.last.call(bytes)

      filename = SecureRandom.hex(16)
      path = self.class.path(filename)
      FileUtils.mkdir_p(path.dirname)
      File.open(path, File::WRONLY | File::CREAT | File::EXCL, 0o644) do |output|
        created = true
        output.binmode
        output.write(bytes)
      end

      @record.update!(artwork_url: "/api/v1/artwork/#{@record.class.table_name}/#{@record.id}/#{filename}")
      @record.artwork_url
    rescue StandardError
      File.delete(path) if defined?(created) && created && File.exist?(path)
      raise
    end
  end
end
