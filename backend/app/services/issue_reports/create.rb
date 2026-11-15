module IssueReports
  class Create
    TITLE_MAX = 120
    DESCRIPTION_MAX = 5_000
    CONTEXT_MAX = 500

    Result = Data.define(:success, :issue, :errors) do
      def success? = success
    end

    def initialize(user:, params:, client: GithubClient.from_env)
      @user = user
      @params = params
      @client = client
    end

    def call
      errors = validate
      return Result.new(success: false, issue: nil, errors: errors) if errors.any?

      issue = @client.create_issue(title: "[User report] #{title}", body: body)
      Result.new(success: true, issue: issue, errors: {})
    end

    private

    def title = @params[:title].to_s.squish
    def description = @params[:description].to_s.strip
    def context(key) = @params[key].to_s.strip.truncate(CONTEXT_MAX)

    def validate
      errors = {}
      errors[:title] = [ "can't be blank" ] if title.blank?
      errors[:title] = [ "is too long (maximum is #{TITLE_MAX} characters)" ] if title.length > TITLE_MAX
      errors[:description] = [ "can't be blank" ] if description.blank?
      if description.length > DESCRIPTION_MAX
        errors[:description] = [ "is too long (maximum is #{DESCRIPTION_MAX} characters)" ]
      end
      errors
    end

    def body
      <<~MARKDOWN
        #{description}

        ---

        | Context | Value |
        | --- | --- |
        | Page | #{table_cell(context(:page_url))} |
        | Language | #{table_cell(context(:language))} |
        | Viewport | #{table_cell(context(:viewport))} |
        | User agent | #{table_cell(context(:user_agent))} |
        | Reporter | user ##{@user.id} |

        _Submitted from the in-app issue reporter._
      MARKDOWN
    end

    def table_cell(value)
      value.presence ? "`#{value.delete('`|').gsub(/\s+/, ' ')}`" : "—"
    end
  end
end
