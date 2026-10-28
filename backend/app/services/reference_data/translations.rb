module ReferenceData
  class Translations
    SUPPORTED_LOCALES = %w[en pl].freeze

    def self.normalize_locale(locale)
      candidate = locale.to_s.split(/[-_]/).first
      SUPPORTED_LOCALES.include?(candidate) ? candidate.to_sym : :en
    end

    def self.for(record, field, locale: :en)
      return if record.nil?

      value = record.public_send(field)
      return value if value.nil?

      translate(
        record.class.model_name.element,
        record.slug,
        field,
        value,
        locale: locale
      )
    end

    def self.translate(resource, slug, field, value, locale: :en)
      normalized_locale = normalize_locale(locale)
      return value if normalized_locale == :en || slug.blank?

      I18n.t(
        "reference_data.#{resource}.#{slug}.#{field}",
        locale: normalized_locale,
        default: value
      )
    end

    def self.label(category, key, value, locale: :en)
      normalized_locale = normalize_locale(locale)
      return value if normalized_locale == :en

      I18n.t("reference_data.#{category}.#{key}", locale: normalized_locale, default: value)
    end

    private_class_method :new
  end
end
