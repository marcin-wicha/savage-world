module Api
  module V1
    module Admin
      class ReferenceDataController < ApplicationController
        RESOURCE_CLASSES = {
          "origins" => Origin,
          "hindrances" => Hindrance,
          "edges" => Edge,
          "skills" => Skill,
          "gears" => Gear,
          "powers" => Power
        }.freeze
        RESOURCE_LABELS = {
          "origins" => "Origins",
          "hindrances" => "Hindrances",
          "edges" => "Edges",
          "skills" => "Skills",
          "gears" => "Gear",
          "powers" => "Powers"
        }.freeze

        before_action :authorize_admin
        before_action :load_resource_class, except: :index
        before_action :load_record, only: %i[update destroy]

        def index
          render json: {
            resources: RESOURCE_CLASSES.map do |key, klass|
              { key: key, label: RESOURCE_LABELS.fetch(key), count: klass.count }
            end
          }
        end

        def show
          render json: { resource: resource_key, records: resource_class.order(:id).map { |record| serialize_record(record) } }
        end

        def create
          record = resource_class.new(record_params)
          if record.save
            render json: { record: serialize_record(record) }, status: :created
          else
            render_validation_errors(record)
          end
        end

        def update
          if @record.update(record_params)
            render json: { record: serialize_record(@record) }
          else
            render_validation_errors(@record)
          end
        end

        def destroy
          if @record.destroy
            head :no_content
          else
            render json: { error: "Could not delete record" }, status: :unprocessable_content
          end
        rescue ActiveRecord::InvalidForeignKey
          render json: { error: "Cannot delete a record that is in use" }, status: :unprocessable_content
        end

        private

        attr_reader :resource_class, :resource_key

        def authorize_admin
          authorize :admin, :manage?
        end

        def load_resource_class
          @resource_key = params[:resource]
          @resource_class = RESOURCE_CLASSES.fetch(@resource_key) { raise ActiveRecord::RecordNotFound }
        end

        def load_record
          @record = resource_class.find(params[:id])
        end

        def record_params
          permitted = resource_class.column_names - %w[id created_at updated_at]
          params.require(:record).permit(*permitted)
        end

        def serialize_record(record)
          attributes = record.attributes.except("created_at", "updated_at")
          attributes["severity"] = record.severity if record.is_a?(Hindrance)
          attributes["minimum_rank"] = record.minimum_rank if record.is_a?(Edge)
          attributes["rank"] = record.rank if record.is_a?(Power)
          attributes
        end

        def render_validation_errors(record)
          render json: { error: "Validation failed", details: record.errors.to_hash }, status: :unprocessable_content
        end
      end
    end
  end
end
