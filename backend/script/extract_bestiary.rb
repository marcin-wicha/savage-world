#!/usr/bin/env ruby
# Run outside Bundler with the pdf-reader gem; output is private and must be reviewed before seeding.
require "pdf/reader"
require "yaml"
require "fileutils"

SOURCES = [
  { path: ARGV.fetch(0), filename: "core.yml", pages: 182..202, page_offset: 2 },
  { path: ARGV.fetch(1), filename: "fantasy.yml", pages: 175..253, page_offset: 2 }
].freeze
OUTPUT = File.expand_path("../db/data/bestiary/private", __dir__)
DIE = /d(?:4|6|8|10|12)(?:\+\d+)?/i
SKILLS = %w[academics athletics battle boating common-knowledge driving electronics faith fighting focus gambling
  hacking healing intimidation language notice occult performance persuasion piloting psionics repair research riding
  science shooting spellcasting stealth survival taunt thievery weird-science].freeze


def blocks(reader, pages)
  sections = []
  pages.each do |number|
    page = reader.pages[number - 1]
    width = page.rectangles[:MediaBox].width
    [ [ 0, width / 2 ], [ width / 2, width ] ].each do |left, right|
      runs = page.runs.select { |run| run.x >= left && run.x < right && run.y.between?(45, 690) }
      headings = runs.select { |run| run.font_size.between?(12, 20) && run.text.match?(/[a-z]{3}/i) }
        .reject { |run| run.text.match?(/\A(?:Bestiary|Fantasy Companion|Special Abilities|Chapter|Size Table|Wild Card Monsters)\z/i) }
        .sort_by { |run| -run.y }
      headings.each_with_index do |heading, index|
        lower = headings[index + 1]&.y || 45
        rect = PDF::Reader::Rectangle.new(left, lower + 1, right, heading.y + 3)
        marker = runs.select { |run| (run.y - heading.y).abs < 2 && run.x < heading.x && run.x > heading.x - 35 }
          .map(&:text).join.strip
        sections << { name: heading.text.strip, text: page.text(rect: rect), page: number,
          wild_card: marker.match?(/\A(?:D|W|X)+/) }
      end
    end
  end
  sections
end

def parse(section)
  text = section[:text].gsub(/([[:alpha:]])-\s*\n\s*([[:alpha:]])/, '\\1\\2')
  attributes_text = text[/Attributes:\s*(.*?)\bSkills:/mi, 1]
  stat_line = text[/Pace:\s*\d+\s*;\s*Parry:\s*\d+\s*;\s*Toughness:\s*\d+(?:\s*\(\d+\))?/i]
  return unless attributes_text && stat_line

  attributes = %w[Agility Smarts Spirit Strength Vigor].to_h do |attribute|
    die = attributes_text[/\b#{attribute}\s*(#{DIE})/i, 1]
    [ attribute.downcase, die&.downcase ]
  end
  return if attributes.values.any?(&:nil?)

  skills_text = text[/Skills:\s*(.*?)\bPace:/mi, 1].to_s.gsub(/\s+/, " ")
  skills = skills_text.scan(/([A-Za-z][A-Za-z\s]*?)\s*(#{DIE})/i).to_h do |name, die|
    slug = name.strip.downcase.gsub(/[^a-z]/, "")
    slug = "common-knowledge" if slug == "commonknowledge"
    slug = "intimidation" if slug == "intimidate"
    [ slug, die.downcase ]
  end
  skills.select! { |slug, _die| SKILLS.include?(slug) }
  stats = stat_line.match(/Pace:\s*(\d+)\s*;\s*Parry:\s*(\d+)\s*;\s*Toughness:\s*(\d+)(?:\s*\((\d+)\))?/i)
  size = text[/\bSize\s*([−-]?\d+)\b/, 1]&.tr("−", "-")&.to_i || 0
  gear = text[/Gear:\s*(.*?)(?:Special Abilities:|\z)/mi, 1].to_s
  weapons = gear.scan(/([A-Za-z][A-Za-z -]{2,30})\s*\(\s*(Str\s*\+\s*d(?:4|6|8|10|12)(?:\s*\+\s*\d+)?|\d+d(?:4|6|8|10|12)(?:\s*\+\s*\d+)?)/i)
    .map { |name, damage| { "name" => name.strip.split(",").last.strip.capitalize, "damage" => damage.delete(" ") } }
  attacks = text.scan(/(?:^|\n)\s*[•\s]*([A-Za-z]+(?:\/[A-Za-z]+)?):\s*(Str\s*\+\s*d(?:4|6|8|10|12)(?:\s*\+\s*\d+)?)/i)
    .map { |name, damage| { "name" => name, "damage" => damage.delete(" ") } }
  weapons = (weapons + attacks).uniq.take(6)
  abilities = %w[fearless undead construct hardy elemental resilient very_resilient].select do |ability|
    label = ability.tr("_", " ")
    text.match?(/(?:^|\n)\s*[•\s]*#{Regexp.escape(label)}\s*:/i)
  end
  {
    "source_key" => section[:name].downcase.gsub(/[^a-z0-9]+/, "-").gsub(/\A-|-\z/, ""),
    "name" => section[:name].split.map(&:capitalize).join(" "),
    "attribute_dice" => attributes,
    "skills" => skills,
    "pace" => stats[1].to_i,
    "parry" => stats[2].to_i,
    "toughness" => stats[3].to_i,
    "armor" => stats[4].to_i,
    "size" => size,
    "wild_card" => section[:wild_card],
    "bennies" => section[:wild_card] ? 2 : 0,
    "weapons" => weapons,
    "edge_slugs" => [],
    "abilities" => abilities
  }
end

FileUtils.mkdir_p(OUTPUT)
SOURCES.each do |source|
  reader = PDF::Reader.new(source[:path])
  entries = blocks(reader, source[:pages]).filter_map do |section|
    parse(section)&.merge("description" => "#{source[:filename].delete_suffix('.yml').capitalize} Rules, p. #{section[:page] - source[:page_offset]}")
  end
  if source[:filename] == "core.yml"
    entries.each do |entry|
      entry["source_key"] = { "dragon" => "mature-dragon", "goblin" => "goblin-warrior" }.fetch(entry["source_key"], entry["source_key"])
    end
  end
  entries = entries.reverse.uniq { |entry| entry.fetch("source_key") }.reverse
  path = File.join(OUTPUT, source[:filename])
  File.write(path, YAML.dump({ "monsters" => entries }))
  warn "#{path}: #{entries.length} candidates. Review every stat block against the PDF before seeding."
end
