# Battle simulator

The battle simulator pits a party's accepted characters against enemies from the
current user's bestiary. The server plays both sides and returns one detailed
round-by-round log plus aggregate outcomes over many seeded runs. The frontend
only displays results; all rules live in `backend/app/services/battles/`.

## Flow

1. `POST /api/v1/parties/:party_id/battles` with
   `{ "battle": { "enemies": [{ "enemy_template_id": 1, "count": 4 }], "runs": 50, "seed": 42, "settings": { ... } } }`.
2. `Battles::Create` snapshots every combatant into a plain definition hash
   (`Battles::CombatantBuilder`), validates limits, and runs `Battles::Simulator`.
3. The simulator runs `Battles::Engine` once per seed (`seed`, `seed + 1`, …),
   records the full event log for the first run only, and aggregates win rates,
   rounds, and per-combatant incapacitation/death/flee rates.
4. The `battles` row stores the seed, settings, roster snapshot, summary, first
   run log, and final state, so later edits to characters or templates never
   change a recorded battle. The same seed and roster always reproduce the same
   result.

Limits: 1–200 runs (default 50), at most 30 combatants, 1–20 copies per enemy
template, 1–30 rounds (default 20). Simulations run synchronously; 200 runs of a
seven-combatant fight take well under a second.

## Battlefield model

Distances are abstract: each combatant has a position on a single line in
inches. The party starts at `0` and enemies at `starting_distance`. Melee
requires being within 1″ plus weapon reach. Area templates hit every active
combatant (on either side) within the template radius of the target point.

## Rules coverage

| Area | Implemented |
| --- | --- |
| Trait rolls | Acing, Wild Die, unskilled d4−2, critical failures (Extras confirm with a d6), multiple trait dice for RoF/Frenzy |
| Initiative | 54-card Action Deck, suit order, reshuffle after a Joker round, Jokers (+2 trait and damage, Bennies to heroes or the GM pool), Extras of one template share a card, Level Headed, Quick, Hesitant |
| Movement | Pace, running die (−2 multi-action), withdrawing provokes free attacks, First Strike |
| Melee | Parry, Gang Up (max +4, cancelled by the defender's adjacent allies, Block/Improved Block), Wild Attack, Defend, Unarmed Defender, two weapons (Two-Fisted, Ambidextrous), Frenzy/Improved Frenzy, Sweep/Improved Sweep, Counterattack, Trademark Weapon, Brawler/Bruiser unarmed damage |
| Ranged | TN 4, Short/Medium/Long range, RoF and Recoil, shots and reloading, thrown weapons, Marksman aim, Dodge, shield cover, global cover and illumination, innocent bystanders, area templates, minimum Strength |
| Other attacks | Called shot to the head (+4 damage; ignored by undead, constructs, elementals), Intimidation/Taunt Tests (Vulnerable; Shaken on a raise; Fearless is immune), Size and Scale |
| Damage | Armor and AP, raise bonus d6, Shaken/Wounds, Shaken twice wounds (except Hardy), Extras out on any wound, Resilient/Very Resilient, Soak rolls (Iron Jaw), Hold the Line |
| Recovery | Shaken (Spirit, Combat Reflexes, Command, undead/construct bonus, Benny), Stunned (Vigor), Distracted/Vulnerable until the end of the victim's next turn |
| Incapacitation | Vigor roll with wound penalties (Hard to Kill), Injury Table, Bleeding Out each round, death on critical failure (Harder to Kill) |
| Bennies | 3 per hero (+Luck/Great Luck), template Bennies for enemy Wild Cards, GM pool of one per hero, Jokers add more. Wild Cards spend them to soak, recover from Shaken, redraw a low Action Card, and re-roll missed attacks and failed Tests (Elan +2), weak damage (No Mercy +2), Stunned recovery, and incapacitation and bleeding-out rolls. Critical failures are never re-rolled |
| Morale | Optional setting: when half the enemy Extras are down, the rest roll Spirit or flee |

## AI

`Battles::Tactics` controls both sides. It fights adjacent foes, preferring
Shaken, Vulnerable, or wounded targets; shoots from range when it has a loaded
ranged weapon; otherwise advances and runs to close distance. It uses Sweep when
several foes are adjacent, Wild Attacks when only one foe threatens it, called
shots when ordinary damage cannot beat Toughness, and Defend when a badly
wounded hero is alone without Bennies.

Benny policy: always soak a wound and always re-roll survival rolls; recover
from Shaken and Stunned when possible; redraw Action Cards of 5 or lower while
keeping a Benny in reserve; re-roll attacks, damage, and Tests on a Joker turn,
against a Wild Card one wound from being taken out, or with 3+ Bennies.

## Not yet simulated

- Powers and Arcane Backgrounds (characters do not own powers yet)
- Grappling, Entangle, Support, Aim and other maneuvers beyond those above
- Mounted, vehicle, chase, and mass battle rules
- Grid geometry (facing, line of sight, template placement and deviation)
- Setting rules other than morale (for example Gritty Damage)
- Healing during combat
