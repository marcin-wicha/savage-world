module Battles
  class ActionDeck
    SUITS = { "clubs" => 1, "diamonds" => 2, "hearts" => 3, "spades" => 4 }.freeze
    SUIT_SYMBOLS = { "clubs" => "♣", "diamonds" => "♦", "hearts" => "♥", "spades" => "♠" }.freeze
    RANK_LABELS = { 11 => "J", 12 => "Q", 13 => "K", 14 => "A" }.freeze

    Card = Struct.new(:rank, :suit, keyword_init: true) do
      include Comparable

      def joker?
        suit == "joker"
      end

      def value
        joker? ? 1000 + rank : (rank * 10) + SUITS.fetch(suit)
      end

      def <=>(other)
        value <=> other.value
      end

      def label
        return "Joker" if joker?

        "#{RANK_LABELS.fetch(rank, rank.to_s)}#{SUIT_SYMBOLS.fetch(suit)}"
      end

      def as_json(*)
        { rank: rank, suit: suit, label: label, joker: joker? }
      end
    end

    def self.full_deck
      cards = SUITS.keys.flat_map { |suit| (2..14).map { |rank| Card.new(rank: rank, suit: suit) } }
      cards + [ Card.new(rank: 1, suit: "joker"), Card.new(rank: 2, suit: "joker") ]
    end

    attr_reader :joker_dealt

    def initialize(rng)
      @rng = rng
      shuffle!
    end

    def shuffle!
      @cards = self.class.full_deck.shuffle(random: @rng)
      @joker_dealt = false
    end

    def remaining
      @cards.length
    end

    def deal
      shuffle! if @cards.empty?
      card = @cards.pop
      @joker_dealt ||= card.joker?
      card
    end

    def end_round
      shuffle! if joker_dealt
    end
  end
end
