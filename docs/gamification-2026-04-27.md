# Gamification - 2026-04-27

This document defines the roguelite progression loop in plain language.

## Core Terms

- **Epoch**: one tactical cycle inside a round.
- **Round**: a full 12-epoch match.
- **Campaign**: chain of consecutive round victories.
- **Nerf**: negative modifier the player must add after each victory.
- **Perk**: positive modifier bought with credits and equipped before starting a run.
- **Unlock**: permanent meta upgrade purchased in the shop.

## Progression Loop

1. Play a round (12 epochs).
2. Resolve result:
   - **Victory and campaign wins < 12**:
     - player gains no credits
     - player must pick 1 of 3 offered nerfs
     - player configures perk loadout
     - next round starts with same campaign
   - **Defeat**:
     - player gains credits from performance
     - campaign resets (wins and active nerfs reset)
     - player configures next loadout
   - **Victory and campaign reaches 12 wins**:
     - campaign is considered DONE
     - player gains credits from performance with completion bonus
     - campaign resets for future runs

## NERF Catalog

- **Scarce Logistics (`player_less_ap`)**
  - Effect: base AP per epoch is reduced by 1.
- **Hostile Momentum (`enemy_more_drag`)**
  - Effect: enemy friction pressure increases.
- **Signal Attenuation (`less_influence`)**
  - Effect: propagation transfer is reduced.
- **Diplomatic Fatigue (`weaker_actions`)**
  - Effect: diplomacy action impact is reduced.

Nerfs are cumulative during a campaign and reset when the campaign resets.

## Credits Rule

Credits are performance-based and granted only on:

- defeat
- campaign completion at 12 consecutive wins

Performance factors:

- narrative average
- districts controlled
- action-point efficiency
- campaign streak multiplier

When reason is `campaign_done`, an extra multiplier is applied compared to defeat.

## Perks and Loadout

- Perks are purchased in the Meta Shop using credits.
- Purchased perks become owned permanently in local progression.
- Before starting a new run/round, player chooses loadout (max 2 perks).
- Loadout perks combine with unlocks and active nerfs to build effective run modifiers.

## Persistence

Current persistence is local (browser localStorage) and stores:

- credits
- owned perks
- equipped perks
- unlock states
- campaign state (wins, done flag, active nerfs)

Design is intentionally structured so this can be migrated to Supabase later with minimal mapping effort.

## UX Requirements

- End-of-round overlay must show:
  - campaign progress (`wins / 12`)
  - credits earned this result (including when it is zero)
  - total credits
  - campaign done state when applicable
- On victory below 12 wins:
  - nerf choice is mandatory before continuing.
- On defeat or campaign done:
  - player can open shop, configure loadout, and start next run.
