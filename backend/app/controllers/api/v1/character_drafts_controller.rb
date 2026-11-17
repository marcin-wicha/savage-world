module Api
  module V1
    class CharacterDraftsController < ApplicationController
      def index
        authorize CharacterDraft
        drafts = policy_scope(CharacterDraft).order(updated_at: :desc, id: :desc)
        render json: { character_drafts: drafts.map { |draft| summary(draft) } }
      end

      def show
        draft = CharacterDraft.find(params[:id])
        authorize draft
        render json: { character_draft: payload(draft) }
      end

      def create
        draft = CharacterDraft.new(user: Current.user, **draft_attributes)
        authorize draft
        save(draft, :created)
      end

      def update
        draft = CharacterDraft.find(params[:id])
        authorize draft
        draft.assign_attributes(draft_attributes)
        save(draft, :ok)
      end

      def destroy
        draft = CharacterDraft.find(params[:id])
        authorize draft
        draft.destroy!
        head :no_content
      end

      private

      def save(draft, status)
        if draft.save
          render json: { character_draft: payload(draft) }, status: status
        else
          render json: { error: "Validation failed", details: draft.errors.to_hash }, status: :unprocessable_content
        end
      end

      # The draft body is an opaque snapshot of the creation form; it is stored
      # as JSON and only validated as game data when the character is saved.
      def draft_attributes
        body = request.request_parameters["character_draft"]
        raise ActionController::ParameterMissing, :character_draft unless body.is_a?(Hash)

        body.slice("data", "step").to_h.symbolize_keys
      end

      def summary(draft)
        { id: draft.id, name: draft.name, step: draft.step, updated_at: draft.updated_at }
      end

      def payload(draft)
        summary(draft).merge(data: draft.data)
      end
    end
  end
end
