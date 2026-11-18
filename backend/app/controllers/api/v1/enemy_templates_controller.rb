module Api
  module V1
    class EnemyTemplatesController < ApplicationController
      WEAPON_KEYS = %i[name damage ap range rof reach parry min_str shots blast thrown two_handed skill].freeze

      def index
        authorize EnemyTemplate
        templates = policy_scope(EnemyTemplate).order(:name, :id)
        render json: { enemy_templates: templates.map { |template| payload(template) } }
      end

      def show
        template = EnemyTemplate.find(params[:id])
        authorize template
        render json: { enemy_template: payload(template) }
      end

      def create
        attributes = template_params
        attributes[:bennies] = attributes[:wild_card] ? 2 : 0 unless attributes.key?(:bennies)
        template = EnemyTemplate.new(user: Current.user, **attributes)
        authorize template
        save(template, :created)
      end

      def update
        template = EnemyTemplate.find(params[:id])
        authorize template
        template.assign_attributes(template_params)
        save(template, :ok)
      end

      def destroy
        template = EnemyTemplate.find(params[:id])
        authorize template
        template.destroy!
        head :no_content
      end

      private

      def save(template, status)
        if template.save
          render json: { enemy_template: payload(template) }, status: status
        else
          render json: { error: "Validation failed", details: template.errors.to_hash }, status: :unprocessable_content
        end
      end

      def template_params
        attributes = params.require(:enemy_template).permit(
          :name, :description, :wild_card, :pace, :parry, :toughness, :armor, :size, :bennies,
          attribute_dice: {}, skills: {}, weapons: WEAPON_KEYS, edge_slugs: [], abilities: []
        ).to_h.symbolize_keys
        attributes[:wild_card] = ActiveModel::Type::Boolean.new.cast(attributes[:wild_card]) if attributes.key?(:wild_card)
        attributes[:weapons] = attributes[:weapons].map { |weapon| weapon.compact_blank } if attributes[:weapons]
        attributes
      end

      def payload(template)
        {
          id: template.id,
          read_only: template.source_key.present?,
          name: template.name,
          description: template.description,
          wild_card: template.wild_card,
          attribute_dice: template.attribute_dice,
          skills: template.skills,
          pace: template.pace,
          parry: template.parry,
          toughness: template.toughness,
          armor: template.armor,
          size: template.size,
          bennies: template.bennies,
          weapons: template.weapons,
          edge_slugs: template.edge_slugs,
          abilities: template.abilities,
          updated_at: template.updated_at
        }
      end
    end
  end
end
