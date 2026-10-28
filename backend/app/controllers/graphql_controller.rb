class GraphqlController < ApplicationController
  allow_unauthenticated_access only: :execute

  def execute
    resume_session

    result = SavageWorldsSchema.execute(
      params[:query],
      variables: prepare_variables(params[:variables]),
      context: {
              current_user: Current.user,
              current_session: Current.session,
              locale: requested_locale
            },
      operation_name: params[:operationName].presence || params[:operation_name].presence
    )

    render json: result
  rescue GraphQL::ParseError => e
    render json: { errors: [ { message: e.message } ] }, status: :unprocessable_content
  end

  private

  def prepare_variables(variables)
    return {} if variables.blank?

    variables = JSON.parse(variables) if variables.is_a?(String)
    variables
  rescue JSON::ParserError
    {}
  end
end
