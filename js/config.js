    const SUPABASE_URL = 'https://hxizbuomlguaodxvxtrq.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXpidW9tbGd1YW9keHZ4dHJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MjMzMTgsImV4cCI6MjA4ODA5OTMxOH0.9pUzmWaZLqp7uCHUPopwmzqLWlRXh2inEvxTgObCPUM';
    const LEAGUE_CODE = 'Testosterone1';
    const BUDGET_TOTAL = 300;
    const OPENF1_BASE = 'https://api.openf1.org/v1';

    // ── POWER-UP SHOP ─────────────────────────────────────────────
    // Ogni power-up si acquista una volta per GP con i crediti residui dall'asta
    const POWERUPS = {
      shield: {
        id: 'shield', ico: '🛡️', name: 'Scudo Difensivo', cost: 25,
        color: 'var(--pu-shield)',
        desc: 'Annulla tutti i malus fantasy del weekend (DNF, DSQ, penalità, posizioni perse).',
        effect: 'noNegative'
      },
      double: {
        id: 'double', ico: '💣', name: 'Doppia Posta', cost: 30,
        color: 'var(--pu-double)',
        desc: 'I punti dei pronostici vengono raddoppiati per questo GP.',
        effect: 'doublePred'
      },
      turbo: {
        id: 'turbo', ico: '⚡', name: 'Turbo Weekend', cost: 35,
        color: 'var(--pu-turbo)',
        desc: 'Tutti i punti fantasy del weekend vengono moltiplicati ×1.5.',
        effect: 'turboFantasy'
      },
      eagle: {
        id: 'eagle', ico: '🎯', name: 'Occhio di Falco', cost: 40,
        color: 'var(--pu-eye)',
        desc: 'Ogni pronostico esatto vale +5 punti bonus aggiuntivi (cumulativi).',
        effect: 'eagleBonus'
      },
      jolly: {
        id: 'jolly', ico: '🔄', name: 'Jolly Scuderia', cost: 25,
        color: 'var(--pu-jolly)',
        desc: 'I punti della scuderia (posizioni guadagnate/perse) valgono il doppio.',
        effect: 'doubleTeam'
      }
    };

    let sb, currentUser, currentProfile;
    let liveInterval = null, cdInterval = null;
    let currentStab = 'gen';
    let currentLiveTab = 'pos';
    let _sc_count = 0;
    let _first_dnf = '';
    let _team_double = '';

    // ══════════════════ DATI 2026 ══════════════════

    // Ordine per valore/forza: 1.Russell → 22.Bottas — valore d'asta + stipendio per GP
    let DRIVERS_2026 = [
      { name: 'George Russell', abbr: 'RUS', num: 63, team: 'Mercedes', tc: '27F4D2', price: 70, salary: 30 },
      { name: 'Lando Norris', abbr: 'NOR', num: 1, team: 'McLaren', tc: 'FF8000', price: 66, salary: 30 },
      { name: 'Max Verstappen', abbr: 'VER', num: 3, team: 'Red Bull', tc: '3671C6', price: 62, salary: 30 },
      { name: 'Charles Leclerc', abbr: 'LEC', num: 16, team: 'Ferrari', tc: 'E8002D', price: 58, salary: 28 },
      { name: 'Kimi Antonelli', abbr: 'ANT', num: 12, team: 'Mercedes', tc: '27F4D2', price: 54, salary: 27 },
      { name: 'Oscar Piastri', abbr: 'PIA', num: 81, team: 'McLaren', tc: 'FF8000', price: 50, salary: 26 },
      { name: 'Lewis Hamilton', abbr: 'HAM', num: 44, team: 'Ferrari', tc: 'E8002D', price: 48, salary: 27 },
      { name: 'Isack Hadjar', abbr: 'HAD', num: 6, team: 'Red Bull', tc: '3671C6', price: 45, salary: 24 },
      { name: 'Pierre Gasly', abbr: 'GAS', num: 10, team: 'Alpine', tc: 'FF87BC', price: 40, salary: 22 },
      { name: 'Oliver Bearman', abbr: 'BEA', num: 87, team: 'Haas', tc: 'B6BABD', price: 40, salary: 20 },
      { name: 'Carlos Sainz', abbr: 'SAI', num: 55, team: 'Williams', tc: '64C4FF', price: 36, salary: 21 },
      { name: 'Alex Albon', abbr: 'ALB', num: 23, team: 'Williams', tc: '64C4FF', price: 34, salary: 21 },
      { name: 'Esteban Ocon', abbr: 'OCO', num: 31, team: 'Haas', tc: 'B6BABD', price: 32, salary: 21 },
      { name: 'Liam Lawson', abbr: 'LAW', num: 30, team: 'Racing Bulls', tc: '6692FF', price: 29, salary: 19 },
      { name: 'Fernando Alonso', abbr: 'ALO', num: 14, team: 'Aston Martin', tc: '358C75', price: 29, salary: 19 },
      { name: 'Gabriel Bortoleto', abbr: 'BOR', num: 5, team: 'Audi', tc: '52E252', price: 27, salary: 18 },
      { name: 'Franco Colapinto', abbr: 'COL', num: 43, team: 'Alpine', tc: 'FF87BC', price: 25, salary: 16 },
      { name: 'Nico Hülkenberg', abbr: 'HUL', num: 27, team: 'Audi', tc: '52E252', price: 25, salary: 18 },
      { name: 'Arvid Lindblad', abbr: 'LIN', num: 41, team: 'Racing Bulls', tc: '6692FF', price: 22, salary: 15 },
      { name: 'Lance Stroll', abbr: 'STR', num: 18, team: 'Aston Martin', tc: '358C75', price: 22, salary: 16 },
      { name: 'Sergio Pérez', abbr: 'PER', num: 11, team: 'Cadillac', tc: 'D0D0D0', price: 20, salary: 17 },
      { name: 'Valtteri Bottas', abbr: 'BOT', num: 77, team: 'Cadillac', tc: 'D0D0D0', price: 20, salary: 17 },
    ];

    // Ordine costruttori per forza: Mercedes → Cadillac
    const TEAMS_2026 = ['Mercedes', 'McLaren', 'Ferrari', 'Red Bull', 'Alpine', 'Haas', 'Williams', 'Audi', 'Racing Bulls', 'Aston Martin', 'Cadillac'];

    // ── FASCE PILOTI (per variazione valore mercato) ──
    const DRIVER_TIERS = {
      top: ['George Russell', 'Lando Norris', 'Max Verstappen', 'Charles Leclerc', 'Kimi Antonelli', 'Oscar Piastri', 'Lewis Hamilton', 'Isack Hadjar'],
      mid: ['Pierre Gasly', 'Oliver Bearman', 'Carlos Sainz', 'Alex Albon', 'Esteban Ocon', 'Liam Lawson', 'Franco Colapinto'],
      low: ['Fernando Alonso', 'Gabriel Bortoleto', 'Nico Hülkenberg', 'Arvid Lindblad', 'Lance Stroll', 'Sergio Pérez', 'Valtteri Bottas']
    };

    // variazione per posizione (indice 0=P1 ... 21=P22)
    const TIER_DELTA = {
      top: [+3, +2, +2, +1, 0, 0, 0, -1, -1, -2, -3, -3, -3, -3, -4, -4, -4, -5, -5, -5, -5, -5],
      mid: [+5, +4, +4, +4, +3, +2, +2, +1, 0, 0, 0, 0, 0, 0, -1, -1, -2, -2, -3, -3, -4, -4],
      low: [+7, +7, +6, +6, +5, +5, +4, +4, +3, +2, +1, +1, +1, 0, 0, 0, 0, 0, 0, -1, -1, -1]
    };
    const DNF_DELTA_DRIVER = -2;

    // ── FASCE SCUDERIE ──
    const TEAM_TIERS = {
      top: ['Mercedes', 'McLaren', 'Ferrari', 'Red Bull'],
      mid: ['Alpine', 'Haas', 'Williams'],
      low: ['Audi', 'Aston Martin', 'Cadillac', 'Racing Bulls']
    };
    // posizione costruttore = posizione in campionato costruttori del weekend (1°=2 piloti top10, etc.)
    // usiamo posizione media dei due piloti nel top10 come proxy: 1-11
    const TEAM_TIER_DELTA = {
      top: [+2, +2, +1, 0, -1, -2, -3, -3, -3, -3, -3],
      mid: [+4, +3, +2, +2, +1, 0, 0, 0, -1, -2, -2],
      low: [+5, +4, +4, +3, +2, +1, +1, +1, 0, 0, -1]
    };

    // Prezzi costruttori (valore d'asta) e stipendi per GP
    const TEAM_PRICES_2026 = {
      'Mercedes': 73,
      'McLaren': 68,
      'Ferrari': 64,
      'Red Bull': 60,
      'Alpine': 52,
      'Haas': 50,
      'Williams': 47,
      'Audi': 44,
      'Racing Bulls': 41,
      'Aston Martin': 36,
      'Cadillac': 33,
    };

    const TEAM_SALARIES_2026 = {
      'Mercedes': 40,
      'McLaren': 38,
      'Ferrari': 36,
      'Red Bull': 36,
      'Alpine': 32,
      'Haas': 32,
      'Williams': 31,
      'Audi': 28,
      'Racing Bulls': 27,
      'Aston Martin': 25,
      'Cadillac': 23,
    };

    const CALENDAR_2026 = [
      { id: 'r01', round: 1, flag: '🇦🇺', name: "GP Australia", circuit: 'Albert Park', sprint: false, sessions: { fp1: '2026-03-06T02:30Z', fp2: '2026-03-06T06:00Z', fp3: '2026-03-07T02:30Z', qual: '2026-03-07T06:00Z', race: '2026-03-08T04:00Z' } },
      { id: 'r02', round: 2, flag: '🇨🇳', name: "GP Cina", circuit: 'Shanghai', sprint: true, sessions: { fp1: '2026-03-13T03:30Z', sq: '2026-03-13T07:30Z', spr: '2026-03-14T03:00Z', qual: '2026-03-14T07:00Z', race: '2026-03-15T07:00Z' } },
      { id: 'r03', round: 3, flag: '🇯🇵', name: "GP Giappone", circuit: 'Suzuka', sprint: false, sessions: { fp1: '2026-03-27T02:30Z', fp2: '2026-03-27T06:00Z', fp3: '2026-03-28T03:30Z', qual: '2026-03-28T07:00Z', race: '2026-03-29T05:00Z' } },
      { id: 'r04', round: 4, flag: '🇧🇭', name: "GP Bahrain", circuit: 'Sakhir', sprint: false, sessions: { fp1: '2026-04-10T12:30Z', fp2: '2026-04-10T16:00Z', fp3: '2026-04-11T12:30Z', qual: '2026-04-11T16:00Z', race: '2026-04-12T15:00Z' } },
      { id: 'r05', round: 5, flag: '🇸🇦', name: "GP Arabia Saudita", circuit: 'Jeddah', sprint: false, sessions: { fp1: '2026-04-17T13:30Z', fp2: '2026-04-17T17:00Z', fp3: '2026-04-18T13:30Z', qual: '2026-04-18T17:00Z', race: '2026-04-19T17:00Z' } },
      { id: 'r06', round: 6, flag: '🇺🇸', name: "GP Miami", circuit: 'Miami', sprint: true, sessions: { fp1: '2026-05-01T17:30Z', sq: '2026-05-01T21:30Z', spr: '2026-05-02T17:00Z', qual: '2026-05-02T21:00Z', race: '2026-05-03T19:00Z' } },
      { id: 'r07', round: 7, flag: '🇨🇦', name: "GP Canada", circuit: 'Gilles Villeneuve', sprint: true, sessions: { fp1: '2026-05-22T16:30Z', sq: '2026-05-22T20:30Z', spr: '2026-05-23T15:30Z', qual: '2026-05-23T19:30Z', race: '2026-05-24T18:00Z' } },
      { id: 'r08', round: 8, flag: '🇲🇨', name: "GP Monaco", circuit: 'Monaco', sprint: false, sessions: { fp1: '2026-06-05T11:30Z', fp2: '2026-06-05T15:00Z', fp3: '2026-06-06T10:30Z', qual: '2026-06-06T14:00Z', race: '2026-06-07T13:00Z' } },
      { id: 'r09', round: 9, flag: '🇪🇸', name: "GP Spagna", circuit: 'Barcelona', sprint: false, sessions: { fp1: '2026-06-12T11:30Z', fp2: '2026-06-12T15:00Z', fp3: '2026-06-13T10:30Z', qual: '2026-06-13T14:00Z', race: '2026-06-14T13:00Z' } },
      { id: 'r10', round: 10, flag: '🇦🇹', name: "GP Austria", circuit: 'Red Bull Ring', sprint: false, sessions: { fp1: '2026-06-26T11:30Z', fp2: '2026-06-26T15:00Z', fp3: '2026-06-27T10:30Z', qual: '2026-06-27T14:00Z', race: '2026-06-28T13:00Z' } },
      { id: 'r11', round: 11, flag: '🇬🇧', name: "GP Gran Bretagna", circuit: 'Silverstone', sprint: true, sessions: { fp1: '2026-07-03T11:30Z', sq: '2026-07-03T15:30Z', spr: '2026-07-04T11:00Z', qual: '2026-07-04T15:00Z', race: '2026-07-05T14:00Z' } },
      { id: 'r12', round: 12, flag: '🇧🇪', name: "GP Belgio", circuit: 'Spa', sprint: false, sessions: { fp1: '2026-07-17T11:30Z', fp2: '2026-07-17T15:00Z', fp3: '2026-07-18T10:30Z', qual: '2026-07-18T14:00Z', race: '2026-07-19T13:00Z' } },
      { id: 'r13', round: 13, flag: '🇭🇺', name: "GP Ungheria", circuit: 'Hungaroring', sprint: false, sessions: { fp1: '2026-07-24T11:30Z', fp2: '2026-07-24T15:00Z', fp3: '2026-07-25T10:30Z', qual: '2026-07-25T14:00Z', race: '2026-07-26T13:00Z' } },
      { id: 'r14', round: 14, flag: '🇳🇱', name: "GP Olanda", circuit: 'Zandvoort', sprint: true, sessions: { fp1: '2026-08-21T10:30Z', sq: '2026-08-21T14:30Z', spr: '2026-08-22T10:00Z', qual: '2026-08-22T14:00Z', race: '2026-08-23T13:00Z' } },
      { id: 'r15', round: 15, flag: '🇮🇹', name: "GP Italia", circuit: 'Monza', sprint: false, sessions: { fp1: '2026-09-04T11:30Z', fp2: '2026-09-04T15:00Z', fp3: '2026-09-05T10:30Z', qual: '2026-09-05T14:00Z', race: '2026-09-06T13:00Z' } },
      { id: 'r16', round: 16, flag: '🇪🇸', name: "GP Madrid", circuit: 'Madrid', sprint: false, sessions: { fp1: '2026-09-11T11:30Z', fp2: '2026-09-11T15:00Z', fp3: '2026-09-12T10:30Z', qual: '2026-09-12T14:00Z', race: '2026-09-13T13:00Z' } },
      { id: 'r17', round: 17, flag: '🇦🇿', name: "GP Azerbaigian", circuit: 'Baku', sprint: false, sessions: { fp1: '2026-09-25T07:30Z', fp2: '2026-09-25T11:00Z', fp3: '2026-09-26T07:30Z', qual: '2026-09-26T11:00Z', race: '2026-09-27T11:00Z' } },
      { id: 'r18', round: 18, flag: '🇸🇬', name: "GP Singapore", circuit: 'Marina Bay', sprint: true, sessions: { fp1: '2026-10-09T09:30Z', sq: '2026-10-09T13:30Z', spr: '2026-10-10T09:00Z', qual: '2026-10-10T13:00Z', race: '2026-10-11T12:00Z' } },
      { id: 'r19', round: 19, flag: '🇺🇸', name: "GP USA Austin", circuit: 'COTA', sprint: false, sessions: { fp1: '2026-10-23T17:30Z', fp2: '2026-10-23T21:00Z', fp3: '2026-10-24T17:30Z', qual: '2026-10-24T21:00Z', race: '2026-10-25T19:00Z' } },
      { id: 'r20', round: 20, flag: '🇲🇽', name: "GP Messico", circuit: 'Hermanos Rodriguez', sprint: false, sessions: { fp1: '2026-10-30T18:30Z', fp2: '2026-10-30T22:00Z', fp3: '2026-10-31T17:30Z', qual: '2026-10-31T21:00Z', race: '2026-11-01T20:00Z' } },
      { id: 'r21', round: 21, flag: '🇧🇷', name: "GP Brasile", circuit: 'Interlagos', sprint: false, sessions: { fp1: '2026-11-06T14:30Z', fp2: '2026-11-06T18:00Z', fp3: '2026-11-07T13:30Z', qual: '2026-11-07T17:00Z', race: '2026-11-08T17:00Z' } },
      { id: 'r22', round: 22, flag: '🇺🇸', name: "GP Las Vegas", circuit: 'Las Vegas Strip', sprint: false, sessions: { fp1: '2026-11-20T04:30Z', fp2: '2026-11-20T08:00Z', fp3: '2026-11-21T04:00Z', qual: '2026-11-21T07:00Z', race: '2026-11-22T06:00Z' } },
      { id: 'r23', round: 23, flag: '🇶🇦', name: "GP Qatar", circuit: 'Lusail', sprint: false, sessions: { fp1: '2026-11-27T13:30Z', fp2: '2026-11-27T17:00Z', fp3: '2026-11-28T12:30Z', qual: '2026-11-28T16:00Z', race: '2026-11-29T15:00Z' } },
      { id: 'r24', round: 24, flag: '🇦🇪', name: "GP Abu Dhabi", circuit: 'Yas Marina', sprint: false, sessions: { fp1: '2026-12-04T09:30Z', fp2: '2026-12-04T13:00Z', fp3: '2026-12-05T10:30Z', qual: '2026-12-05T14:00Z', race: '2026-12-06T13:00Z' } },
    ];

    // ══════════ PUNTEGGI COMPLETI ══════════

    const RACE_PTS = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 };
    const QUAL_PTS = { pole: 8, p2: 6, p3: 5, p4_10: 3, q1out: -4 };
    const SPRINT_PTS = { 1: 8, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1 };

    // PREDICT scoring — sistema aggiornato 2026
    // CREDITI
    const PRED_CR = {
      win_exact: 10,            // Predict vincitore esatto
      podium_exact: 8,          // Podio posizione esatta
      podium_wrong_pos: 4,      // Pilota nel podio ma posizione sbagliata
      top10_correct: 2,         // Top10 (pos 4-10): ogni pilota corretto
      sc_correct: 5,            // Safety Car risposta corretta
      rf_correct: 7,            // Bandiera Rossa risposta corretta
      fastest_pit: 6,           // Prima scuderia al pit stop
      fastest_lap: 6,           // Giro veloce pilota corretto
      best_comeback: 8,         // Pilota che guadagna più posizioni
      pole_correct: 7,          // Pole position pilota corretto
      q3_correct: 2,            // Chi entra in Q3: per pilota corretto
      constructor_perf: 6,      // Costruttore con più punti nel weekend
      retires_exact: 10,        // Totale ritiri numero esatto
      retires_close: 5,         // Totale ritiri ±1
    };
    // PUNTI
    const PRED = {
      // Vincitore gara
      win_exact: 12,            // pilota corretto
      win_podium: 5,            // è sul podio ma non P1
      // Podio P1-P2-P3
      pos_exact: 10,            // posizione esatta corretta
      pos_in_podium: 4,         // pilota giusto ma posizione sbagliata
      pos_not_podium: 0,        // fuori podio (nessun malus)
      // 4°-5° (mantenuto per compatibilità UI)
      p45_exact: 6, p45_correct: 3, p45_wrong: 0,
      // Top 10 (pos 4-10): per ogni pilota corretto nella top10 senza pos esatta
      top10_correct: 3,         // +3 per pilota corretto in top10
      top10_exact: 3,           // alias per compatibilità
      top10_in_points: 0,       // non usato
      top10_wrong: 0,
      // Safety Car
      sc_exact: 5, sc_wrong: 0,
      // Bandiera Rossa
      rf_exact: 7, rf_wrong: 0,
      // Fastest Pit Stop
      fastest_pit: 6,
      // Giro Veloce
      fastest: 8,
      // Miglior Rimonta
      best_comeback: 10,        // corretto
      best_comeback_top3: 4,    // se tra i primi 3 che guadagnano più pos
      // Pole Position
      pole_exact: 8,            // alias
      pole_top3: 4,
      pole_out: 0,
      // Q3 (10 piloti): per ogni pilota corretto
      q3_correct: 2,
      // Costruttore più performante
      constructor_perf: 8,
      constructor_podio_bonus: 0,
      // Totale ritiri
      retires_exact: 10,
      retires_close: 5,
      retires_far: 0,
      retire_driver: 0,
      retire_dns_bonus: 0,
      // Sprint
      sprint_exact: 0, sprint_top3_exact: 0, sprint_in_top3: 0,
      // Team double (legacy)
      team_double_both: 8, team_double_one: 3, team_double_none: 0,
      // Grid / Best Weekend
      grid_best_weekend: 8,
      // Primo DNF
      first_dnf: 5,
      // Perfect weekend
      perfect: 25, super_perfect: 40
    };


