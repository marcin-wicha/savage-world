require "rails_helper"

RSpec.describe Battles::ActionDeck do
  let(:deck) { described_class.new(Random.new(3)) }

  it "has 52 cards and two Jokers" do
    cards = described_class.full_deck

    expect(cards.length).to eq(54)
    expect(cards.count(&:joker?)).to eq(2)
  end

  it "orders cards by rank, then spades, hearts, diamonds, clubs, with Jokers highest" do
    card = ->(rank, suit) { described_class::Card.new(rank: rank, suit: suit) }

    expect(card.(14, "spades")).to be > card.(14, "hearts")
    expect(card.(14, "hearts")).to be > card.(14, "diamonds")
    expect(card.(14, "diamonds")).to be > card.(14, "clubs")
    expect(card.(2, "spades")).to be < card.(3, "clubs")
    expect(card.(1, "joker")).to be > card.(14, "spades")
    expect(card.(12, "hearts").label).to eq("Q♥")
  end

  it "reshuffles at the end of a round in which a Joker was dealt" do
    54.times { deck.deal } until deck.joker_dealt
    deck.end_round

    expect(deck.remaining).to eq(54)
    expect(deck.joker_dealt).to be(false)
  end

  it "keeps the deck between rounds without a Joker" do
    deck.instance_variable_set(:@cards, [ described_class::Card.new(rank: 5, suit: "clubs") ] * 3)
    deck.deal
    deck.end_round

    expect(deck.remaining).to eq(2)
  end

  it "reshuffles when it runs out" do
    deck.instance_variable_set(:@cards, [])

    expect(deck.deal).to be_a(described_class::Card)
    expect(deck.remaining).to eq(53)
  end
end
