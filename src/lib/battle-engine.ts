// Battle engine: stat stages, status, weather, hazards, items, abilities
import {
  type PokemonCard, type BattleMove, type StatusCondition, type Weather,
  type HazardKind, type Ability, effectiveness, statAt,
} from "./pokemon";

export interface Fighter {
  id: string;
  card: PokemonCard;
  level: number;
  maxHp: number;
  currentHp: number;
  status: StatusCondition;
  statusTurns: number;
  stages: { attack: number; defense: number; sp_atk: number; sp_def: number; speed: number; accuracy: number; evasion: number };
  fainted: boolean;
  movePP: number[];
  lockedMove?: number;
  flinched?: boolean;
  sashUsed?: boolean;
  berryUsed?: boolean;
  fullHp: number;
  defending?: boolean; // Defend stance: 50% damage reduction this turn
  charging?: boolean;  // Charged: next move 1.5x and never misses
  damageMult?: number; // Multiplier consumed on next attack (Power Pill, Charge)
  mustCrit?: boolean;  // Next attack is guaranteed crit (Focus Tonic)
  barrierTurns?: number; // Halves incoming damage for N enemy attacks (Iron Barrier)
}

export interface SideState {
  hazards: { stealth_rock: boolean; spikes: number; toxic_spikes: number };
  team: Fighter[];
  active: number;
}

export interface BattleState {
  player: SideState;
  enemy: SideState;
  weather: Weather;
  weatherTurns: number;
  log: string[];
  turn: number;
  ended: boolean;
  winner: "player" | "enemy" | null;
}

export function makeFighter(card: PokemonCard, idPrefix = "f"): Fighter {
  const level = card.level ?? 5;
  const evs = card.evs ?? { hp: 0, attack: 0, defense: 0, sp_atk: 0, sp_def: 0, speed: 0 };
  const maxHp = statAt(card.hp, level, true, evs.hp);
  return {
    id: `${idPrefix}-${card.pokemon_id}-${Math.random().toString(36).slice(2, 6)}`,
    card,
    level,
    maxHp,
    fullHp: maxHp,
    currentHp: maxHp,
    status: null,
    statusTurns: 0,
    stages: { attack: 0, defense: 0, sp_atk: 0, sp_def: 0, speed: 0, accuracy: 0, evasion: 0 },
    fainted: false,
    movePP: card.moves.map(m => m.pp),
  };
}

export function newBattle(playerCards: PokemonCard[], enemyCards: PokemonCard[]): BattleState {
  return {
    player: { hazards: { stealth_rock: false, spikes: 0, toxic_spikes: 0 }, team: playerCards.map(c => makeFighter(c, "p")), active: 0 },
    enemy: { hazards: { stealth_rock: false, spikes: 0, toxic_spikes: 0 }, team: enemyCards.map(c => makeFighter(c, "e")), active: 0 },
    weather: null, weatherTurns: 0,
    log: ["Battle begins!"], turn: 1, ended: false, winner: null,
  };
}

const stageMult = (s: number) => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));

function effStat(f: Fighter, kind: "attack" | "defense" | "sp_atk" | "sp_def" | "speed", weather: Weather) {
  const base = f.card[kind];
  const ev = f.card.evs?.[kind] ?? 0;
  let v = statAt(base, f.level, false, ev) * stageMult(f.stages[kind]);
  if (kind === "attack" && f.status === "burn") v *= 0.5;
  if (kind === "speed" && f.status === "paralysis") v *= 0.5;
  const item = f.card.held_item;
  if (item === "choice_band" && kind === "attack") v *= 1.5;
  if (item === "choice_specs" && kind === "sp_atk") v *= 1.5;
  if (item === "choice_scarf" && kind === "speed") v *= 1.5;
  if (weather === "sandstorm" && kind === "sp_def" && f.card.types.includes("rock")) v *= 1.5;
  return v;
}

function applyAbilityOnSwitch(side: "player" | "enemy", state: BattleState, log: (s: string) => void) {
  const me = side === "player" ? state.player.team[state.player.active] : state.enemy.team[state.enemy.active];
  const foe = side === "player" ? state.enemy.team[state.enemy.active] : state.player.team[state.player.active];
  if (!me) return;
  if (me.card.ability === "intimidate" && foe && !foe.fainted) {
    foe.stages.attack = Math.max(-6, foe.stages.attack - 1);
    log(`${me.card.name}'s Intimidate cut ${foe.card.name}'s Attack!`);
  }
  if (me.card.ability === "drought") { state.weather = "sun"; state.weatherTurns = 5; log(`${me.card.name} intensified the sun!`); }
  if (me.card.ability === "drizzle") { state.weather = "rain"; state.weatherTurns = 5; log(`${me.card.name} summoned rain!`); }
  if (me.card.ability === "sand_stream") { state.weather = "sandstorm"; state.weatherTurns = 5; log(`${me.card.name} kicked up a sandstorm!`); }
  // hazards on entry
  const hazards = side === "player" ? state.player.hazards : state.enemy.hazards;
  if (hazards.stealth_rock && me.card.ability !== "levitate") {
    const eff = effectiveness("rock", me.card.types);
    const dmg = Math.max(1, Math.floor((me.maxHp * eff) / 8));
    me.currentHp = Math.max(0, me.currentHp - dmg);
    log(`Pointed stones hurt ${me.card.name}! (-${dmg})`);
    if (me.currentHp === 0) { me.fainted = true; log(`${me.card.name} fainted!`); }
  }
  if (!me.fainted && hazards.spikes > 0 && me.card.ability !== "levitate" && !me.card.types.includes("flying")) {
    const dmg = Math.floor((me.maxHp * (hazards.spikes === 1 ? 1 / 8 : hazards.spikes === 2 ? 1 / 6 : 1 / 4)));
    me.currentHp = Math.max(0, me.currentHp - dmg);
    log(`${me.card.name} was hurt by spikes! (-${dmg})`);
    if (me.currentHp === 0) { me.fainted = true; log(`${me.card.name} fainted!`); }
  }
}

export function startBattle(state: BattleState) {
  applyAbilityOnSwitch("player", state, s => state.log.unshift(s));
  applyAbilityOnSwitch("enemy", state, s => state.log.unshift(s));
}

function damage(attacker: Fighter, defender: Fighter, move: BattleMove, weather: Weather): { dmg: number; eff: number; crit: boolean } {
  if (move.power <= 0) return { dmg: 0, eff: 1, crit: false };
  const isPhys = move.category === "physical";
  const atk = effStat(attacker, isPhys ? "attack" : "sp_atk", weather);
  const def = effStat(defender, isPhys ? "defense" : "sp_def", weather);
  let power = move.power;
  // weather boosts
  if (weather === "sun" && move.type === "fire") power *= 1.5;
  if (weather === "rain" && move.type === "water") power *= 1.5;
  if (weather === "sun" && move.type === "water") power *= 0.5;
  if (weather === "rain" && move.type === "fire") power *= 0.5;
  // ability boosts when low HP (pinch)
  const pinch = attacker.currentHp <= attacker.maxHp / 3;
  if (pinch && attacker.card.ability === "blaze" && move.type === "fire") power *= 1.5;
  if (pinch && attacker.card.ability === "torrent" && move.type === "water") power *= 1.5;
  if (pinch && attacker.card.ability === "overgrow" && move.type === "grass") power *= 1.5;
  if (pinch && attacker.card.ability === "swarm" && move.type === "bug") power *= 1.5;
  // STAB
  const stab = attacker.card.types.includes(move.type) ? 1.5 : 1;
  // Type effectiveness; levitate immunity
  let eff = effectiveness(move.type, defender.card.types);
  if (defender.card.ability === "levitate" && move.type === "ground") eff = 0;
  // Item
  let itemMod = 1;
  if (attacker.card.held_item === "life_orb") itemMod = 1.3;
  // Crit (1/16) — guaranteed if mustCrit is set
  const crit = attacker.mustCrit ? true : Math.random() < 1 / 16;
  const critMod = crit ? 1.5 : 1;
  // Random factor
  const rand = 0.85 + Math.random() * 0.15;
  const defendMod = defender.defending ? 0.5 : 1;
  const barrierMod = (defender.barrierTurns ?? 0) > 0 ? 0.5 : 1;
  const attackerMult = attacker.damageMult ?? 1;
  const base = ((((2 * attacker.level) / 5 + 2) * power * (atk / def)) / 50 + 2);
  let dmg = Math.floor(base * stab * eff * itemMod * critMod * rand * defendMod * barrierMod * attackerMult);
  // Sturdy
  if (defender.card.ability === "sturdy" && defender.currentHp === defender.maxHp && dmg >= defender.currentHp) dmg = defender.currentHp - 1;
  // Focus Sash
  if (defender.card.held_item === "focus_sash" && !defender.sashUsed && defender.currentHp === defender.fullHp && dmg >= defender.currentHp) {
    dmg = defender.currentHp - 1;
    defender.sashUsed = true;
  }
  return { dmg: Math.max(1, dmg), eff, crit };
}

function applyMoveEffect(attacker: Fighter, defender: Fighter, move: BattleMove, state: BattleState, log: (s: string) => void) {
  const eff = move.effect;
  if (!eff) return;
  if (eff.chance && Math.random() > eff.chance) return;
  if (eff.kind === "status" && eff.status) {
    const target = eff.target === "self" ? attacker : defender;
    if (!target.status && !target.fainted) {
      // type immunities
      if (eff.status === "burn" && target.card.types.includes("fire")) return;
      if (eff.status === "poison" && (target.card.types.includes("poison") || target.card.types.includes("steel"))) return;
      if (eff.status === "paralysis" && target.card.types.includes("electric")) return;
      target.status = eff.status;
      log(`${target.card.name} is now ${eff.status}!`);
    }
  } else if (eff.kind === "stat" && eff.stat) {
    const target = eff.target === "self" ? attacker : defender;
    const cur = target.stages[eff.stat];
    const next = Math.max(-6, Math.min(6, cur + (eff.stages ?? 1)));
    target.stages[eff.stat] = next;
    log(`${target.card.name}'s ${eff.stat} ${(eff.stages ?? 0) > 0 ? "rose" : "fell"}!`);
  }
}

export type BattleAction =
  | { kind: "move"; index: number }
  | { kind: "switch"; index: number }
  | { kind: "defend" }
  | { kind: "charge" }
  | { kind: "item"; itemKey: string; targetIdx?: number };

// Single-side action executor — used for strict alternating turns.
export function executeAction(state: BattleState, side: "player" | "enemy", action: BattleAction) {
  if (state.ended) return;
  const log = (s: string) => state.log.unshift(s);
  const me = side === "player" ? state.player : state.enemy;
  const opp = side === "player" ? state.enemy : state.player;
  const a = me.team[me.active];
  const d = opp.team[opp.active];

  // The brace from this side's previous turn lasted through the opponent's turn — clear it now.
  a.defending = false;

  if (action.kind === "switch") {
    me.active = action.index;
    log(`${side === "player" ? "You" : "Foe"} switched to ${me.team[me.active].card.name}.`);
    applyAbilityOnSwitch(side, state, log);
    return;
  }
  if (action.kind === "defend") {
    a.defending = true;
    log(`${a.card.name} braced for impact!`);
    return;
  }
  if (action.kind === "charge") {
    a.charging = true;
    a.damageMult = Math.max(a.damageMult ?? 1, 1.5);
    log(`${a.card.name} is charging power… next move hits 1.5x and won't miss!`);
    return;
  }
  if (action.kind === "item") {
    if (side !== "player") return;
    const it = action.itemKey;
    const tIdx = action.targetIdx ?? state.player.active;
    const self = state.player.team[tIdx];
    const foe = d; // current enemy active
    const tryStatus = (target: Fighter, status: StatusCondition, label: string, immune: (t: Fighter) => boolean) => {
      if (target.fainted) { log(`No effect — target has fainted.`); return; }
      if (target.status) { log(`${target.card.name} already has a status condition!`); return; }
      if (immune(target)) { log(`It had no effect on ${target.card.name}!`); return; }
      target.status = status;
      if (status === "sleep") target.statusTurns = 2 + Math.floor(Math.random() * 2);
      log(`${target.card.name} was ${label}!`);
    };
    if (it === "potion" && !self.fainted) {
      const heal = Math.floor(self.maxHp / 2);
      self.currentHp = Math.min(self.maxHp, self.currentHp + heal);
      log(`Used Potion on ${self.card.name} (+${heal}).`);
    } else if (it === "super_potion" && !self.fainted) {
      const heal = self.maxHp - self.currentHp;
      self.currentHp = self.maxHp;
      log(`Used Super Potion on ${self.card.name} (+${heal}).`);
    } else if (it === "revive" && self.fainted) {
      self.fainted = false;
      self.currentHp = Math.floor(self.maxHp / 2);
      log(`${self.card.name} was revived!`);
    } else if (it === "x_attack" && !a.fainted) {
      a.stages.attack = Math.min(6, a.stages.attack + 1); log(`${a.card.name}'s Attack rose sharply!`);
    } else if (it === "x_defense" && !a.fainted) {
      a.stages.defense = Math.min(6, a.stages.defense + 1); log(`${a.card.name}'s Defense rose sharply!`);
    } else if (it === "x_speed" && !a.fainted) {
      a.stages.speed = Math.min(6, a.stages.speed + 1); log(`${a.card.name}'s Speed rose sharply!`);
    } else if (it === "smoke_bomb") {
      foe.stages.accuracy = Math.max(-6, foe.stages.accuracy - 2);
      log(`Smoke clouded ${foe.card.name} — Accuracy fell harshly!`);
    } else if (it === "poison_vial") {
      tryStatus(foe, "poison", "poisoned", t => t.card.types.includes("poison") || t.card.types.includes("steel"));
    } else if (it === "burn_flask") {
      tryStatus(foe, "burn", "burned", t => t.card.types.includes("fire"));
    } else if (it === "paralyze_spray") {
      tryStatus(foe, "paralysis", "paralyzed", t => t.card.types.includes("electric"));
    } else if (it === "sleep_powder") {
      tryStatus(foe, "sleep", "lulled to sleep", t => t.card.types.includes("grass"));
    } else if (it === "ether" && !a.fainted) {
      a.movePP = a.movePP.map((p, i) => Math.min(a.card.moves[i].pp, p + 10));
      log(`${a.card.name}'s moves regained 10 PP each.`);
    } else if (it === "power_pill" && !a.fainted) {
      a.damageMult = Math.max(a.damageMult ?? 1, 2);
      log(`${a.card.name} is surging — next move deals DOUBLE damage!`);
    } else if (it === "focus_tonic" && !a.fainted) {
      a.mustCrit = true;
      log(`${a.card.name} focused intently — next attack will CRIT!`);
    } else if (it === "iron_barrier" && !a.fainted) {
      a.barrierTurns = 2;
      log(`An iron barrier surrounds ${a.card.name}! Incoming damage is halved (2 hits).`);
    } else {
      log(`The item had no effect.`);
    }
    return;
  }
  if (action.kind === "move") {
    if (a.fainted || d.fainted) return;
    if (a.flinched) { log(`${a.card.name} flinched!`); a.flinched = false; }
    else if (a.status === "sleep") {
      a.statusTurns--;
      if (a.statusTurns <= 0) { a.status = null; log(`${a.card.name} woke up!`); }
      else log(`${a.card.name} is fast asleep.`);
    }
    else if (a.status === "freeze") {
      if (Math.random() < 0.2) { a.status = null; log(`${a.card.name} thawed out!`); }
      else log(`${a.card.name} is frozen!`);
    }
    else if (a.status === "paralysis" && Math.random() < 0.25) {
      log(`${a.card.name} is fully paralyzed!`);
    }
    else {
      const move = a.card.moves[action.index];
      if (a.movePP[action.index] <= 0) log(`${a.card.name} has no PP for ${move.name}!`);
      else {
        a.movePP[action.index]--;
        const charged = !!a.charging;
        const accRoll = charged ? 2 : move.accuracy / 100 * stageMult(a.stages.accuracy) / stageMult(d.stages.evasion);
        if (Math.random() > accRoll) log(`${a.card.name}'s ${move.name} missed!`);
        else {
          const { dmg, eff, crit } = damage(a, d, move, state.weather);
          // Consume single-use offensive buffs
          const usedMult = a.damageMult ?? 1;
          a.damageMult = 1;
          a.mustCrit = false;
          a.charging = false;
          if (dmg > 0) {
            d.currentHp = Math.max(0, d.currentHp - dmg);
            // Consume one barrier charge after taking damage
            if ((d.barrierTurns ?? 0) > 0) d.barrierTurns = (d.barrierTurns ?? 0) - 1;
            const tag = usedMult > 1 ? ` ×${usedMult}` : "";
            log(`${a.card.name} used ${move.name} — ${dmg}${tag}${crit ? " CRIT!" : ""}${eff > 1 ? " (super effective)" : eff < 1 && eff > 0 ? " (resisted)" : eff === 0 ? " (no effect)" : ""}`);
            if (d.card.ability === "static" && move.category === "physical" && !a.status && Math.random() < 0.3) {
              a.status = "paralysis"; log(`${a.card.name} was paralyzed by Static!`);
            }
            if (a.card.held_item === "life_orb") {
              const r = Math.floor(a.maxHp / 10);
              a.currentHp = Math.max(0, a.currentHp - r);
              log(`${a.card.name} lost ${r} HP to Life Orb.`);
            }
          } else log(`${a.card.name} used ${move.name}.`);
          applyMoveEffect(a, d, move, state, log);
        }
      }
    }
    if (d.currentHp === 0 && !d.fainted) { d.fainted = true; log(`${d.card.name} fainted!`); }
    if (a.currentHp === 0 && !a.fainted) { a.fainted = true; log(`${a.card.name} fainted!`); }
  }
}

// Call after each side's action: auto-switch fainted active, end battle if no one left.
export function postAction(state: BattleState) {
  if (state.ended) return;
  for (const side of ["player", "enemy"] as const) {
    const ss = state[side];
    if (ss.team[ss.active].fainted) {
      const next = ss.team.findIndex(t => !t.fainted);
      if (next === -1) {
        state.ended = true;
        state.winner = side === "player" ? "enemy" : "player";
        return;
      }
      ss.active = next;
      state.log.unshift(`${side === "player" ? "You sent out" : "Foe sent out"} ${ss.team[next].card.name}!`);
      applyAbilityOnSwitch(side, state, s => state.log.unshift(s));
    }
  }
}

// Run end-of-round chip damage / weather / leftovers / berry, then bump turn counter.
export function tickRound(state: BattleState) {
  if (state.ended) return;
  endOfTurn(state, s => state.log.unshift(s));
  state.turn++;
  postAction(state);
}

export function executeTurn(state: BattleState, playerAction: BattleAction, getEnemyAction?: (s: BattleState) => BattleAction) {
  if (state.ended) return;
  const log = (s: string) => state.log.unshift(s);
  const enemyAction = (getEnemyAction ?? defaultEnemyAI)(state);

  // switches happen first
  // reset transient stance
  state.player.team[state.player.active].defending = false;
  state.enemy.team[state.enemy.active].defending = false;

  if (playerAction.kind === "switch") {
    state.player.active = playerAction.index;
    log(`You switched to ${state.player.team[state.player.active].card.name}.`);
    applyAbilityOnSwitch("player", state, log);
  }
  if (enemyAction.kind === "switch") {
    state.enemy.active = enemyAction.index;
    log(`Foe sent out ${state.enemy.team[state.enemy.active].card.name}.`);
    applyAbilityOnSwitch("enemy", state, log);
  }

  // Defend stance: applies for this turn
  if (playerAction.kind === "defend") {
    const f = state.player.team[state.player.active];
    f.defending = true;
    log(`${f.card.name} braced for impact!`);
  }
  if (enemyAction.kind === "defend") {
    const f = state.enemy.team[state.enemy.active];
    f.defending = true;
    log(`${f.card.name} braced for impact!`);
  }

  // Item use (player only typically)
  if (playerAction.kind === "item") {
    const it = playerAction.itemKey;
    const tIdx = playerAction.targetIdx ?? state.player.active;
    const t = state.player.team[tIdx];
    if (it === "potion" && !t.fainted) {
      const heal = Math.floor(t.maxHp / 2);
      t.currentHp = Math.min(t.maxHp, t.currentHp + heal);
      log(`Used Potion on ${t.card.name} (+${heal}).`);
    } else if (it === "super_potion" && !t.fainted) {
      const heal = t.maxHp - t.currentHp;
      t.currentHp = t.maxHp;
      log(`Used Super Potion on ${t.card.name} (+${heal}).`);
    } else if (it === "revive" && t.fainted) {
      t.fainted = false;
      t.currentHp = Math.floor(t.maxHp / 2);
      log(`${t.card.name} was revived!`);
    }
  }

  const p = state.player.team[state.player.active];
  const e = state.enemy.team[state.enemy.active];

  // determine order for moves
  const playerMove = playerAction.kind === "move" ? p.card.moves[playerAction.index] : null;
  const enemyMove = enemyAction.kind === "move" ? e.card.moves[enemyAction.index] : null;
  const pPrio = playerMove?.priority ?? 0;
  const ePrio = enemyMove?.priority ?? 0;
  const pSpeed = effStat(p, "speed", state.weather);
  const eSpeed = effStat(e, "speed", state.weather);
  const playerFirst = playerAction.kind === "switch" ? true
    : enemyAction.kind === "switch" ? true
    : pPrio !== ePrio ? pPrio > ePrio
    : pSpeed >= eSpeed;

  const acts: Array<() => void> = [];
  const doMove = (sideName: "player" | "enemy") => {
    const a = sideName === "player" ? state.player.team[state.player.active] : state.enemy.team[state.enemy.active];
    const d = sideName === "player" ? state.enemy.team[state.enemy.active] : state.player.team[state.player.active];
    const action = sideName === "player" ? playerAction : enemyAction;
    if (action.kind !== "move" || a.fainted || d.fainted) return;
    if (a.flinched) { log(`${a.card.name} flinched!`); a.flinched = false; return; }
    if (a.status === "sleep") {
      a.statusTurns--;
      if (a.statusTurns <= 0) { a.status = null; log(`${a.card.name} woke up!`); }
      else { log(`${a.card.name} is fast asleep.`); return; }
    }
    if (a.status === "freeze") {
      if (Math.random() < 0.2) { a.status = null; log(`${a.card.name} thawed out!`); }
      else { log(`${a.card.name} is frozen!`); return; }
    }
    if (a.status === "paralysis" && Math.random() < 0.25) { log(`${a.card.name} is fully paralyzed!`); return; }
    const move = a.card.moves[action.index];
    if (a.movePP[action.index] <= 0) { log(`${a.card.name} has no PP for ${move.name}!`); return; }
    a.movePP[action.index]--;
    // accuracy
    const accRoll = move.accuracy / 100 * stageMult(a.stages.accuracy) / stageMult(d.stages.evasion);
    if (Math.random() > accRoll) { log(`${a.card.name}'s ${move.name} missed!`); return; }
    const { dmg, eff, crit } = damage(a, d, move, state.weather);
    if (dmg > 0) {
      d.currentHp = Math.max(0, d.currentHp - dmg);
      log(`${a.card.name} used ${move.name} — ${dmg}${crit ? " CRIT!" : ""}${eff > 1 ? " (super effective)" : eff < 1 && eff > 0 ? " (resisted)" : eff === 0 ? " (no effect)" : ""}`);
      // Static
      if (d.card.ability === "static" && move.category === "physical" && !a.status && Math.random() < 0.3) {
        a.status = "paralysis"; log(`${a.card.name} was paralyzed by Static!`);
      }
      // Life orb recoil
      if (a.card.held_item === "life_orb") {
        const r = Math.floor(a.maxHp / 10);
        a.currentHp = Math.max(0, a.currentHp - r);
        log(`${a.card.name} lost ${r} HP to Life Orb.`);
      }
    } else {
      log(`${a.card.name} used ${move.name}.`);
    }
    applyMoveEffect(a, d, move, state, log);
    if (d.currentHp === 0 && !d.fainted) { d.fainted = true; log(`${d.card.name} fainted!`); }
    if (a.currentHp === 0 && !a.fainted) { a.fainted = true; log(`${a.card.name} fainted!`); }
  };

  if (playerFirst) { acts.push(() => doMove("player")); acts.push(() => doMove("enemy")); }
  else { acts.push(() => doMove("enemy")); acts.push(() => doMove("player")); }
  acts.forEach(fn => fn());

  // End-of-turn: weather, status chip, leftovers, sitrus
  endOfTurn(state, log);
  state.turn++;

  // Auto-switch fainted active
  for (const side of ["player", "enemy"] as const) {
    const ss = state[side];
    if (ss.team[ss.active].fainted) {
      const next = ss.team.findIndex(t => !t.fainted);
      if (next === -1) {
        state.ended = true;
        state.winner = side === "player" ? "enemy" : "player";
        return;
      }
      ss.active = next;
      log(`${side === "player" ? "You sent out" : "Foe sent out"} ${ss.team[next].card.name}!`);
      applyAbilityOnSwitch(side, state, log);
    }
  }
}

function endOfTurn(state: BattleState, log: (s: string) => void) {
  if (state.weather && state.weatherTurns > 0) {
    state.weatherTurns--;
    if (state.weather === "sandstorm") {
      for (const side of [state.player, state.enemy]) {
        const f = side.team[side.active];
        if (f.fainted) continue;
        if (!["rock", "ground", "steel"].some(t => f.card.types.includes(t))) {
          const dmg = Math.floor(f.maxHp / 16);
          f.currentHp = Math.max(0, f.currentHp - dmg);
          log(`${f.card.name} was buffeted by sandstorm! (-${dmg})`);
          if (f.currentHp === 0) f.fainted = true;
        }
      }
    }
    if (state.weather === "hail") {
      for (const side of [state.player, state.enemy]) {
        const f = side.team[side.active];
        if (f.fainted || f.card.types.includes("ice")) continue;
        const dmg = Math.floor(f.maxHp / 16);
        f.currentHp = Math.max(0, f.currentHp - dmg);
        log(`${f.card.name} was pelted by hail! (-${dmg})`);
        if (f.currentHp === 0) f.fainted = true;
      }
    }
    if (state.weatherTurns === 0) { log(`The ${state.weather} faded.`); state.weather = null; }
  }
  for (const side of [state.player, state.enemy]) {
    const f = side.team[side.active];
    if (f.fainted) continue;
    // status chip
    if (f.status === "burn") { const d = Math.floor(f.maxHp / 16); f.currentHp = Math.max(0, f.currentHp - d); log(`${f.card.name} was hurt by its burn! (-${d})`); }
    if (f.status === "poison") { const d = Math.floor(f.maxHp / 8); f.currentHp = Math.max(0, f.currentHp - d); log(`${f.card.name} is hurt by poison! (-${d})`); }
    // Leftovers
    if (f.card.held_item === "leftovers" && f.currentHp < f.maxHp) {
      const heal = Math.floor(f.maxHp / 16);
      f.currentHp = Math.min(f.maxHp, f.currentHp + heal);
      log(`${f.card.name} restored ${heal} HP with Leftovers.`);
    }
    // Sitrus berry at <= 50%
    if (f.card.held_item === "sitrus_berry" && !f.berryUsed && f.currentHp > 0 && f.currentHp <= f.maxHp / 2) {
      const heal = Math.floor(f.maxHp / 4);
      f.currentHp = Math.min(f.maxHp, f.currentHp + heal);
      f.berryUsed = true;
      log(`${f.card.name} ate its Sitrus Berry. (+${heal})`);
    }
    if (f.currentHp === 0) f.fainted = true;
  }
}

// Default AI: pick highest expected damage; switch if locked into 0-effectiveness
export function defaultEnemyAI(state: BattleState): BattleAction {
  const e = state.enemy.team[state.enemy.active];
  const p = state.player.team[state.player.active];
  let bestIdx = 0; let bestScore = -1;
  e.card.moves.forEach((m, i) => {
    if (e.movePP[i] <= 0) return;
    const eff = effectiveness(m.type, p.card.types);
    const score = (m.power || 30) * eff * (e.card.types.includes(m.type) ? 1.5 : 1);
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  });
  // switch if best move does 0 and we have a better partner
  if (bestScore === 0) {
    const better = state.enemy.team.findIndex((t, i) =>
      i !== state.enemy.active && !t.fainted && t.card.moves.some(m => effectiveness(m.type, p.card.types) > 1));
    if (better >= 0) return { kind: "switch", index: better };
  }
  return { kind: "move", index: bestIdx };
}
