// Full 14-matchday Community Cup schedule, pre-loaded as initial state.
// The admin can edit any field (date, time, teams, odds, status) afterward.

let _id = 1;
function nextId() {
  return `F${String(_id++).padStart(3, '0')}`;
}

const RAW_SCHEDULE = [
  { matchday: 1, date: 'Sun, Aug 23', games: [
    ['7:15 AM', 'Zuneko FC', 'Pipeline Tornadoes'],
    ['7:45 AM', 'Ultimate FC', 'Clasical FC'],
    ['8:15 AM', 'Breakthrough FC', 'Super Galant FC'],
    ['8:45 AM', 'Dazzle FC', 'Rozas FC'],
  ]},
  { matchday: 2, date: 'Sun, Aug 23', games: [
    ['9:15 AM', 'Ultimate FC', 'Zuneko FC'],
    ['9:45 AM', 'Super Galant FC', 'Dazzle FC'],
    ['10:15 AM', 'Rozas FC', 'Pipeline Tornadoes'],
    ['10:45 AM', 'Clasical FC', 'Breakthrough FC'],
  ]},
  { matchday: 3, date: 'Sun, Aug 30', games: [
    ['7:15 AM', 'Clasical FC', 'Zuneko FC'],
    ['7:45 AM', 'Rozas FC', 'Breakthrough FC'],
    ['8:15 AM', 'Super Galant FC', 'Ultimate FC'],
    ['8:45 AM', 'Pipeline Tornadoes', 'Dazzle FC'],
  ]},
  { matchday: 4, date: 'Sun, Aug 30', games: [
    ['9:15 AM', 'Ultimate FC', 'Rozas FC'],
    ['9:45 AM', 'Breakthrough FC', 'Pipeline Tornadoes'],
    ['10:15 AM', 'Clasical FC', 'Super Galant FC'],
    ['10:45 AM', 'Zuneko FC', 'Dazzle FC'],
  ]},
  { matchday: 5, date: 'Sun, Sep 20', games: [
    ['7:15 AM', 'Pipeline Tornadoes', 'Super Galant FC'],
    ['7:45 AM', 'Zuneko FC', 'Rozas FC'],
    ['8:15 AM', 'Dazzle FC', 'Clasical FC'],
    ['8:45 AM', 'Breakthrough FC', 'Ultimate FC'],
  ]},
  { matchday: 6, date: 'Sun, Sep 20', games: [
    ['9:15 AM', 'Clasical FC', 'Pipeline Tornadoes'],
    ['9:45 AM', 'Breakthrough FC', 'Zuneko FC'],
    ['10:15 AM', 'Ultimate FC', 'Dazzle FC'],
    ['10:45 AM', 'Super Galant FC', 'Rozas FC'],
  ]},
  { matchday: 7, date: 'Sun, Sep 27', games: [
    ['7:15 AM', 'Pipeline Tornadoes', 'Ultimate FC'],
    ['7:45 AM', 'Rozas FC', 'Clasical FC'],
    ['8:15 AM', 'Zuneko FC', 'Super Galant FC'],
    ['8:45 AM', 'Dazzle FC', 'Breakthrough FC'],
  ]},
  { matchday: 8, date: 'Sun, Sep 27', games: [
    ['9:15 AM', 'Pipeline Tornadoes', 'Zuneko FC'],
    ['9:45 AM', 'Rozas FC', 'Dazzle FC'],
    ['10:15 AM', 'Clasical FC', 'Ultimate FC'],
    ['10:45 AM', 'Super Galant FC', 'Breakthrough FC'],
  ]},
  { matchday: 9, date: 'Sun, Oct 18', games: [
    ['7:15 AM', 'Dazzle FC', 'Super Galant FC'],
    ['7:45 AM', 'Breakthrough FC', 'Clasical FC'],
    ['8:15 AM', 'Pipeline Tornadoes', 'Rozas FC'],
    ['8:45 AM', 'Zuneko FC', 'Ultimate FC'],
  ]},
  { matchday: 10, date: 'Sun, Oct 18', games: [
    ['9:15 AM', 'Breakthrough FC', 'Rozas FC'],
    ['9:45 AM', 'Zuneko FC', 'Clasical FC'],
    ['10:15 AM', 'Ultimate FC', 'Super Galant FC'],
    ['10:45 AM', 'Dazzle FC', 'Pipeline Tornadoes'],
  ]},
  { matchday: 11, date: 'Sun, Oct 25', games: [
    ['7:15 AM', 'Rozas FC', 'Ultimate FC'],
    ['7:45 AM', 'Dazzle FC', 'Zuneko FC'],
    ['8:15 AM', 'Pipeline Tornadoes', 'Breakthrough FC'],
    ['8:45 AM', 'Super Galant FC', 'Clasical FC'],
  ]},
  { matchday: 12, date: 'Sun, Oct 25', games: [
    ['9:15 AM', 'Rozas FC', 'Zuneko FC'],
    ['9:45 AM', 'Super Galant FC', 'Pipeline Tornadoes'],
    ['10:15 AM', 'Ultimate FC', 'Breakthrough FC'],
    ['10:45 AM', 'Clasical FC', 'Dazzle FC'],
  ]},
  { matchday: 13, date: 'Sun, Nov 29', games: [
    ['7:15 AM', 'Zuneko FC', 'Breakthrough FC'],
    ['7:45 AM', 'Rozas FC', 'Super Galant FC'],
    ['8:15 AM', 'Pipeline Tornadoes', 'Clasical FC'],
    ['8:45 AM', 'Dazzle FC', 'Ultimate FC'],
  ]},
  { matchday: 14, date: 'Sun, Nov 29', games: [
    ['9:15 AM', 'Super Galant FC', 'Zuneko FC'],
    ['9:45 AM', 'Ultimate FC', 'Pipeline Tornadoes'],
    ['10:15 AM', 'Clasical FC', 'Rozas FC'],
    ['10:45 AM', 'Breakthrough FC', 'Dazzle FC'],
  ]},
];

let _cmId = 1;
const nextCustomMarketId = () => `CM${String(_cmId++).padStart(4, '0')}`;

// Seeded onto every fixture as a starting point. The admin can edit,
// remove, or add to this list per fixture from Admin > Fixtures & Odds —
// nothing here is locked to these exact markets/odds. Also used by
// applyDefaultCustomMarkets() in store.js to backfill any of these
// missing from a fixture that already existed before a new one was
// added here — see the "Add Missing Default Markets" button.
const DEFAULT_CUSTOM_MARKETS_TEMPLATE = [
  { label: 'Double Chance: 1X (Home or Draw)', odds: 1.28 },
  { label: 'Double Chance: 12 (Home or Away)', odds: 1.28 },
  { label: 'Double Chance: X2 (Draw or Away)', odds: 1.73 },
  { label: 'Under 0.5 Goals', odds: 3.00 },
  { label: 'Under 1.5 Goals', odds: 1.45 },
  { label: 'Multigoals: 2-4 Goals', odds: 1.35 },
  { label: 'Multigoals: 3-4 Goals', odds: 2.35 },
  { label: 'Multigoals: 4-6 Goals', odds: 3.00 },
  { label: 'Both Halves Over 1.5: Yes', odds: 3.60 },
  { label: 'Both Halves Over 1.5: No', odds: 1.29 },
  { label: 'Both Halves Under 1.5: Yes', odds: 3.60 },
  { label: 'Both Halves Under 1.5: No', odds: 1.29 },
  { label: '2nd Half Double Chance: Home or Draw', odds: 1.48 },
  { label: '2nd Half Double Chance: Home or Away', odds: 1.40 },
  { label: '2nd Half Double Chance: Draw or Away', odds: 1.39 },
  { label: '2nd Half First Goal: Home', odds: 2.35 },
  { label: '2nd Half First Goal: None', odds: 6.10 },
  { label: '2nd Half First Goal: Away', odds: 2.15 },
  { label: 'Fouls 1X2: Home', odds: 1.61 },
  { label: 'Fouls 1X2: Draw', odds: 10.70 },
  { label: 'Fouls 1X2: Away', odds: 2.75 },
  { label: 'Home Team to Win Both Halves: Yes', odds: 8.60 },
  { label: 'Home Team to Win Both Halves: No', odds: 1.07 },
  { label: 'Away Team to Win Both Halves: Yes', odds: 7.00 },
  { label: 'Away Team to Win Both Halves: No', odds: 1.10 },
  { label: 'Home Team to Win Either Half: Yes', odds: 1.78 },
  { label: 'Home Team to Win Either Half: No', odds: 1.93 },
  { label: 'Away Team to Win Either Half: Yes', odds: 1.62 },
  { label: 'Away Team to Win Either Half: No', odds: 2.15 },
  { label: 'Goal Scored by a Substitution: Yes', odds: 2.35 },
  { label: 'Goal Scored by a Substitution: No', odds: 1.53 },
  { label: 'GG/NG 2+: Yes', odds: 3.41 },
  { label: 'GG/NG 2+: No', odds: 1.27 },
  { label: 'Any Team to Score 2+ Goals in a Row: Yes', odds: 1.45 },
  { label: 'Any Team to Score 2+ Goals in a Row: No', odds: 2.76 },
];

export function makeCustomMarketId() {
  return nextCustomMarketId();
}

export function buildDefaultCustomMarkets() {
  return DEFAULT_CUSTOM_MARKETS_TEMPLATE.map((m) => ({ id: nextCustomMarketId(), ...m }));
}

// Exposed so store.js can backfill fixtures that were created before a
// market was added to the list above (see applyDefaultCustomMarkets()).
export function defaultCustomMarketTemplate() {
  return DEFAULT_CUSTOM_MARKETS_TEMPLATE;
}

const DEFAULT_ODDS = {
  odd_1: 1.85,
  odd_x: 3.10,
  odd_2: 3.60,
  odd_over_2_5: 1.95,
  odd_over_3_5: 2.80,
  odd_btts: 1.75,
  anytime_scorer: '',
  odd_scorer: 3.25,
};

export const TEAM_NAMES = [
  'Zuneko FC', 'Pipeline Tornadoes', 'Ultimate FC', 'Clasical FC',
  'Breakthrough FC', 'Super Galant FC', 'Dazzle FC', 'Rozas FC',
];

export function buildInitialFixtures() {
  const fixtures = [];
  for (const md of RAW_SCHEDULE) {
    for (const [time, home, away] of md.games) {
      fixtures.push({
        id: nextId(),
        matchday: md.matchday,
        date_string: md.date,
        kickoff_time: time,
        home_team: home,
        away_team: away,
        status: 'open', // 'open' | 'live' | 'completed' | 'postponed'
        home_score: null,
        away_score: null,
        ...DEFAULT_ODDS,
        // Free-form extra markets (Double Chance, Multigoals, alternate
        // Over/Under lines, or literally anything the admin wants to add)
        // that don't fit the six fixed odds fields above.
        custom_markets: buildDefaultCustomMarkets(),
        // Set at settlement time: which custom_markets ids actually hit.
        custom_markets_won: [],
      });
    }
  }
  return fixtures;
}

export function buildInitialPlayers() {
  return TEAM_NAMES.map((name, i) => ({
    id: `P${String(i + 1).padStart(3, '0')}`,
    player_name: name,
    status: 'active', // 'active' | 'eliminated'
  }));
}

// Default "Anytime Scorer" roster. `team` is optional — leave it blank and
// the player shows up as a scorer option on every fixture; set it to one
// of TEAM_NAMES to only offer that player on fixtures involving their team.
// The admin can add more players, assign teams, and edit odds at any time.
const DEFAULT_SCORER_NAMES = [
  'BELLAMI', 'DONT DULL', 'OTTO', 'OLOWO', 'NENE', 'SPEAGY', 'LARRY', 'GEDU',
  'ZUNE', 'JOHN', 'NAJEEM', 'ZIKO',
];

export function buildInitialScorers() {
  return DEFAULT_SCORER_NAMES.map((name, i) => ({
    id: `SC${String(i + 1).padStart(3, '0')}`,
    name,
    team: '',
    odds: 3.25,
  }));
}

// Starting roster for the "Player to be Booked" (Cards) market — only
// used to seed a brand-new league from scratch; an already-running
// league's card roster is whatever the admin has added via
// Admin > Cards. Names here are the same ones already appearing in the
// league's paper match record for yellow/red cards. Each entry is
// [name, card_type] — most are yellow; 'OFFICIAL' was recorded as a
// straight red.
const DEFAULT_CARDS = [
  ['NENE', 'yellow'], ['JOHN', 'yellow'], ['KANTE', 'yellow'], ['MONSURU', 'yellow'],
  ['OLAMIDE', 'yellow'], ['CHINKO', 'yellow'], ['RUBBEN', 'yellow'], ['SPAGY DERIN', 'yellow'],
  ['OLOWO', 'yellow'], ['DIRAMIS', 'yellow'], ['FEMI', 'yellow'], ['LARRY', 'yellow'],
  ['GREDI', 'yellow'], ['OFFICIAL', 'red'], ['A-1', 'yellow'],
];

export function buildInitialCards() {
  return DEFAULT_CARDS.map(([name, cardType], i) => ({
    id: `CD${String(i + 1).padStart(3, '0')}`,
    name,
    team: '',
    card_type: cardType,
    odds: 3.25,
  }));
}
