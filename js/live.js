    // ══════════════════ OpenF1 API STATUS CHECK ══════════════════

    async function checkOpenF1Status() {
      const pill = document.getElementById('api-status-pill');
      try {
        const r = await fetch(`${OPENF1_BASE}/sessions?session_type=Race&year=2025&limit=1`);
        if (r.ok) {
          pill.className = 'api-pill ok';
          pill.textContent = '✓ OpenF1';
        } else throw new Error();
      } catch (e) {
        pill.className = 'api-pill fail';
        pill.textContent = '✗ OpenF1';
      }
    }

    // ══════════════════ OpenF1 AUTO-IMPORT ══════════════════

    async function fetchOpenF1RaceResult(raceId) {
      // Usa Jolpica API (gratuita, dati ~30min dopo gara)
      const race = CALENDAR_2026.find(r => r.id === raceId);
      if (!race) return null;
      try {
        const round = race.round;
        const year = 2026;
        const [raceRes, qualiRes] = await Promise.all([
          fetch(`${JOLPICA_BASE}/${year}/${round}/results.json?limit=25`),
          fetch(`${JOLPICA_BASE}/${year}/${round}/qualifying.json?limit=20`)
        ]);
        if (!raceRes.ok) throw new Error('Jolpica HTTP ' + raceRes.status);
        const raceJson = await raceRes.json();
        const qualiJson = await qualiRes.json();
        const raceResults = raceJson?.MRData?.RaceTable?.Races?.[0]?.Results || [];
        const qualiResults = qualiJson?.MRData?.RaceTable?.Races?.[0]?.QualifyingResults || [];
        if (!raceResults.length) throw new Error('Nessun risultato su Jolpica');
        const matchJ = (d) => {
          const drv = DRIVERS_2026.find(x => x.name.toLowerCase().includes(d.familyName.toLowerCase()) || d.familyName.toLowerCase().includes(x.name.split(' ').slice(-1)[0].toLowerCase()));
          return drv?.name || d.givenName + ' ' + d.familyName;
        };
        const top10 = raceResults.slice(0, 10).map(r => matchJ(r.Driver));
        const q10 = qualiResults.slice(0, 10).map(r => matchJ(r.Driver));
        const fastestRow = raceResults.find(r => r.FastestLap?.rank === '1');
        const dnfList = raceResults.filter(r => !r.status.startsWith('+') && r.status !== 'Finished' && !r.status.includes('Lap')).map(r => matchJ(r.Driver));
        const teamPoints = {};
        TEAMS_2026.forEach(team => {
          const td = DRIVERS_2026.filter(d => d.team === team).map(d => d.name);
          teamPoints[team] = td.filter(d => top10.includes(d)).length;
        });

        const gap_data = {};
        raceResults.forEach((r, idx) => {
          const pos = idx + 1;
          const dName = matchJ(r.Driver);
          const gap = r.Time?.time || r.status;
          gap_data[dName] = { pos: pos, gap: gap };
        });
        return {
          race_id: raceId, source: 'jolpica_auto', fetched_at: new Date().toISOString(),
          pole: q10[0] || null, p2_qual: q10[1] || null,
          p1: top10[0] || null, p2: top10[1] || null, p3: top10[2] || null, p4: top10[3] || null, p5: top10[4] || null,
          p6: top10[5] || null, p7: top10[6] || null, p8: top10[7] || null, p9: top10[8] || null, p10: top10[9] || null,
          fastest: fastestRow ? matchJ(fastestRow.Driver) : null,
          qual_p1: q10[0] || null, qual_p2: q10[1] || null, qual_p3: q10[2] || null, qual_p4: q10[3] || null, qual_p5: q10[4] || null,
          qual_p6: q10[5] || null, qual_p7: q10[6] || null, qual_p8: q10[7] || null, qual_p9: q10[8] || null, qual_p10: q10[9] || null,
          retires_count: dnfList.length, dnf_drivers: dnfList.join(', '), first_dnf: dnfList[0] || null,
          rf: false, sc_count: 0, gap_data: gap_data, team_points: teamPoints
        };
      } catch (e) { console.error('Jolpica error:', e); return null; }
    }

    async function buildWeekendResults(sessions, raceId) {
      try {
        const result = {
          race_id: raceId, source: 'openf1_auto', fetched_at: new Date().toISOString(),
          pole: null, p1: null, p2: null, p3: null, p4: null, p5: null, p6: null, p7: null, p8: null, p9: null, p10: null,
          fastest: null, sc_count: 0, rf: false, dnf_drivers: '', first_dnf: null, retires_count: 0, penalty_drivers: '',
          p2_qual: null, qual_p1: null, qual_p2: null, qual_p3: null, qual_p4: null, qual_p5: null,
          qual_p6: null, qual_p7: null, qual_p8: null, qual_p9: null, qual_p10: null,
          sprint_win: null, sprint_p2: null, sprint_p3: null, sprint_fastest: null, sprint_dnf_drivers: '', sprint_order: false,
          fastest_pit_team: null, best_comeback: null, best_weekend_driver: null, constructor_best: null,
          gap_data: {}, team_points: {}
        };

        let sprintSess = sessions.find(s => s.session_type === 'Sprint');
        let qualiSess = sessions.find(s => s.session_name === 'Qualifying' || s.session_type === 'Qualifying');
        let raceSess = sessions.find(s => s.session_type === 'Race');

        // Mappa piloti
        const drvSess = raceSess || qualiSess || sprintSess || sessions[0];
        const drvRes = await fetch(`${OPENF1_BASE}/drivers?session_key=${drvSess.session_key}`);
        const drvData = await drvRes.json();
        const drvMap = {};
        (drvData || []).forEach(d => {
          const dName = matchDriverName(d.full_name);
          drvMap[d.driver_number] = { ...d, fantaName: dName };
        });
        const getDriver = (num) => drvMap[num]?.fantaName || null;

        // --- QUALIFICHE ---
        if (qualiSess) {
          const qPosRes = await fetch(`${OPENF1_BASE}/position?session_key=${qualiSess.session_key}&order=-date&limit=150`);
          const qPosData = await qPosRes.json();
          const qFinal = {};
          (qPosData || []).forEach(p => { if (!qFinal[p.driver_number] || new Date(p.date) > new Date(qFinal[p.driver_number].date)) qFinal[p.driver_number] = p; });
          const qSorted = Object.values(qFinal).sort((a, b) => a.position - b.position).map(p => getDriver(p.driver_number)).filter(Boolean);

          result.pole = qSorted[0] || null;
          result.p2_qual = qSorted[1] || null;
          for (let i = 0; i < 10; i++) result[`qual_p${i + 1}`] = qSorted[i] || null;
        }

        // --- SPRINT ---
        if (sprintSess) {
          result.sprint_order = true;
          const sPosRes = await fetch(`${OPENF1_BASE}/position?session_key=${sprintSess.session_key}&order=-date&limit=150`);
          const sPosData = await sPosRes.json();
          const sFinal = {};
          (sPosData || []).forEach(p => { if (!sFinal[p.driver_number] || new Date(p.date) > new Date(sFinal[p.driver_number].date)) sFinal[p.driver_number] = p; });
          const sSorted = Object.values(sFinal).sort((a, b) => a.position - b.position).map(p => getDriver(p.driver_number)).filter(Boolean);

          result.sprint_win = sSorted[0] || null;
          result.sprint_p2 = sSorted[1] || null;
          result.sprint_p3 = sSorted[2] || null;

          const sLapRes = await fetch(`${OPENF1_BASE}/laps?session_key=${sprintSess.session_key}&is_pit_out_lap=false&order=lap_duration&limit=1`);
          const sLapData = await sLapRes.json();
          result.sprint_fastest = sLapData?.[0] ? getDriver(sLapData[0].driver_number) : null;

          const sRcRes = await fetch(`${OPENF1_BASE}/race_control?session_key=${sprintSess.session_key}&limit=200`);
          const sRcData = await sRcRes.json();
          const sDnf = [];
          (sRcData || []).forEach(e => {
            const msg = (e.message || e.flag || '').toUpperCase();
            if (msg.includes('RETIRE') || msg.includes('DNF') || msg.includes('WITHDREW')) {
              const dName = getDriver(e.driver_number);
              if (dName && !sDnf.includes(dName)) sDnf.push(dName);
            }
          });
          result.sprint_dnf_drivers = sDnf.join(', ');
        }

        // --- RACE ---
        if (raceSess) {
          const rPosRes = await fetch(`${OPENF1_BASE}/position?session_key=${raceSess.session_key}&order=-date&limit=500`);
          const rPosData = await rPosRes.json();
          const rFinal = {};
          (rPosData || []).forEach(p => { if (!rFinal[p.driver_number] || new Date(p.date) > new Date(rFinal[p.driver_number].date)) rFinal[p.driver_number] = p; });
          const rSorted = Object.values(rFinal).sort((a, b) => a.position - b.position).map(p => getDriver(p.driver_number)).filter(Boolean);

          for (let i = 0; i < 10; i++) result[`p${i + 1}`] = rSorted[i] || null;

          const rRcRes = await fetch(`${OPENF1_BASE}/race_control?session_key=${raceSess.session_key}&limit=200`);
          const rRcData = await rRcRes.json();
          let scCount = 0, rfFlag = false, dnfDrivers = [], firstDnf = null;
          const scMessages = new Set();
          (rRcData || []).forEach(e => {
            const msg = (e.message || e.flag || '').toUpperCase();
            const msgKey = msg.substring(0, 20);
            if ((msg.includes('SAFETY CAR') || msg === 'SC') && !scMessages.has(msgKey)) {
              scCount++; scMessages.add(msgKey);
            }
            if (msg.includes('RED FLAG') || msg === 'RED') rfFlag = true;
            if (msg.includes('RETIRE') || msg.includes('DNF') || msg.includes('WITHDREW')) {
              const dName = getDriver(e.driver_number);
              if (dName && !dnfDrivers.includes(dName)) {
                dnfDrivers.push(dName);
                if (!firstDnf) firstDnf = dName;
              }
            }
          });
          result.sc_count = scCount;
          result.rf = rfFlag;
          result.dnf_drivers = dnfDrivers.join(', ');
          result.first_dnf = firstDnf;
          result.retires_count = dnfDrivers.length;

          const rLapRes = await fetch(`${OPENF1_BASE}/laps?session_key=${raceSess.session_key}&is_pit_out_lap=false&order=lap_duration&limit=1`);
          const rLapData = await rLapRes.json();
          result.fastest = rLapData?.[0] ? getDriver(rLapData[0].driver_number) : null;

          // FIRST PIT STOP TEAM
          const pitRes = await fetch(`${OPENF1_BASE}/pit?session_key=${raceSess.session_key}&order=date&limit=1`);
          const pitData = await pitRes.json();
          if (pitData?.[0]) {
            const dName = getDriver(pitData[0].driver_number);
            const drv = DRIVERS_2026.find(d => d.name === dName);
            if (drv) result.fastest_pit_team = drv.team;
          }

          // BEST COMEBACK
          const sgRes = await fetch(`${OPENF1_BASE}/starting_grid?session_key=${raceSess.session_key}&limit=50`);
          const sgData = await sgRes.json();
          let maxGain = -99; let bestComebackDriver = null;
          if (sgData && sgData.length > 0) {
            Object.values(rFinal).forEach(p => {
              const dName = getDriver(p.driver_number);
              if (!dName) return;
              const gridPos = sgData.find(g => g.driver_number === p.driver_number)?.position || 20;
              const gain = gridPos - p.position;
              if (gain > maxGain && !dnfDrivers.includes(dName)) { maxGain = gain; bestComebackDriver = dName; }
            });
          } else if (rSorted.length > 0 && qualiSess) {
            const qPosRes = await fetch(`${OPENF1_BASE}/position?session_key=${qualiSess.session_key}&order=-date&limit=150`);
            const qPosData = await qPosRes.json();
            const qFinal = {};
            (qPosData || []).forEach(p => { if (!qFinal[p.driver_number] || new Date(p.date) > new Date(qFinal[p.driver_number].date)) qFinal[p.driver_number] = p; });
            Object.values(rFinal).forEach(p => {
              const dName = getDriver(p.driver_number);
              if (!dName) return;
              const gridPos = qFinal[p.driver_number]?.position || 20;
              const gain = gridPos - p.position;
              if (gain > maxGain && !dnfDrivers.includes(dName)) { maxGain = gain; bestComebackDriver = dName; }
            });
          }
          result.best_comeback = bestComebackDriver;

          // BEST CONSTRUCTOR
          const f1pts = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
          const teamPointsReale = {};
          TEAMS_2026.forEach(t => teamPointsReale[t] = 0);
          rSorted.forEach((dName, idx) => {
            const dObj = DRIVERS_2026.find(d => d.name === dName);
            if (dObj && idx < 10) teamPointsReale[dObj.team] += f1pts[idx];
          });
          let bestTeam = null, mxPts = -1;
          for (const t in teamPointsReale) { if (teamPointsReale[t] > mxPts) { mxPts = teamPointsReale[t]; bestTeam = t; } }
          result.constructor_best = bestTeam;

          const teamPoints = {};
          TEAMS_2026.forEach(team => {
            const teamDrivers = DRIVERS_2026.filter(d => d.team === team).map(d => d.name);
            const top10 = rSorted.slice(0, 10);
            teamPoints[team] = teamDrivers.filter(d => top10.includes(d)).length;
          });
          result.team_points = teamPoints;
        } else {
          result.team_points = {};
          TEAMS_2026.forEach(t => result.team_points[t] = 0);
        }

        return result;
      } catch (e) {
        console.error('Session fetch error:', e);
        return null;
      }
    }

    // Match OpenF1 full_name to our driver names
    function matchDriverName(fullName) {
      if (!fullName) return null;
      const upper = fullName.toUpperCase();
      // Direct search
      for (const d of DRIVERS_2026) {
        const parts = d.name.toUpperCase().split(' ');
        const lastName = parts[parts.length - 1];
        if (upper.includes(lastName)) return d.name;
      }
      // Fuzzy - first 3 chars of last name
      for (const d of DRIVERS_2026) {
        const parts = d.name.split(' ');
        const abbr3 = parts[parts.length - 1].substring(0, 3).toUpperCase();
        if (upper.includes(abbr3)) return d.name;
      }
      return null;
    }

    // ══════════════════ LIVE — OpenF1 ══════════════════

    let liveData = {
      lap: 0, total: 0, status: 'none', dnf: 0, sc: 0, rf: 0,
      positions: [], raceTitle: '', sessionKey: null,
      intervals: {}, stints: {}, lapTimes: {}
    };

    function setLiveTab(tab) {
      currentLiveTab = tab;
      // tabs: pos, fanta, gaps, quali, race, sprint
      ['pos', 'fanta', 'gaps', 'quali', 'race', 'sprint'].forEach(t => {
        const btn = document.getElementById('ltab-' + t);
        const panelId = t === 'race' ? 'live-race-tab' : t === 'sprint' ? 'live-sprint-tab' : 'live-' + t + '-tab';
        const panel = document.getElementById(panelId);
        if (btn && !btn.classList.contains('hidden')) {
          btn.className = 'btn btn-sm ' + (t === tab ? 'btn-r' : 'btn-g');
          // Re-apply color for special tabs
          if (t !== tab) {
            if (t === 'quali') { btn.style.borderColor = 'rgba(0,232,135,.4)'; btn.style.color = 'var(--green)'; }
            else if (t === 'race') { btn.style.borderColor = 'rgba(255,215,0,.4)'; btn.style.color = 'var(--yellow)'; }
            else if (t === 'sprint') { btn.style.borderColor = 'rgba(192,96,255,.4)'; btn.style.color = 'var(--purple)'; }
            else { btn.style.borderColor = ''; btn.style.color = ''; }
          } else { btn.style.borderColor = ''; btn.style.color = ''; }
        }
        if (panel) panel.classList.toggle('hidden', t !== tab);
      });
      if (tab === 'quali') renderStoredQualiResults();
      if (tab === 'race') renderStoredRaceResults();
      if (tab === 'sprint') renderStoredSprintResults();
      if (tab === 'fanta') updateLiveFantaLB();
    }

    // ══════ SELETTORE GARA + LIVE SYSTEM ══════

    let selectedRaceId = null; // gara selezionata nel selettore
    const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1';

    function initRaceSelector() {
      const scroll = document.getElementById('race-selector-scroll');
      if (!scroll) return;
      const now = new Date();
      scroll.innerHTML = CALENDAR_2026.map(r => {
        const raceTime = new Date(r.sessions.race);
        const isDone = raceTime < now;
        const isNext = !isDone && CALENDAR_2026.filter(x => new Date(x.sessions.race) < now).length === CALENDAR_2026.indexOf(r);
        const cls = isDone ? 'race-pill done' : isNext ? 'race-pill' : 'race-pill upcoming';
        return `<button class="${cls}" onclick="selectRace('${r.id}')" id="rpill-${r.id}">${r.flag} R${r.round}</button>`;
      }).join('');
      // Auto-seleziona prossima gara o ultima disputata
      const nextRace = CALENDAR_2026.find(r => new Date(r.sessions.race) > now);
      const lastDone = [...CALENDAR_2026].reverse().find(r => new Date(r.sessions.race) < now);
      const autoSelect = lastDone || nextRace || CALENDAR_2026[0];
      if (autoSelect) selectRace(autoSelect.id);
    }

    function selectRace(raceId) {
      selectedRaceId = raceId;
      // Aggiorna pill attiva
      CALENDAR_2026.forEach(r => {
        const pill = document.getElementById('rpill-' + r.id);
        if (!pill) return;
        const now = new Date();
        const isDone = new Date(r.sessions.race) < now;
        const cls = 'race-pill' + (isDone ? ' done' : ' upcoming') + (r.id === raceId ? ' active' : '');
        pill.className = cls;
      });
      // Scroll la pill selezionata in vista
      const activePill = document.getElementById('rpill-' + raceId);
      if (activePill) activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

      const race = CALENDAR_2026.find(r => r.id === raceId);
      if (!race) return;
      document.getElementById('live-racename').textContent = `${race.flag} ${race.name}`;

      // Mostra/nascondi tab Sprint
      const sprintBtn = document.getElementById('ltab-sprint');
      if (sprintBtn) sprintBtn.classList.toggle('hidden', !race.sprint);

      // Determina stato gara
      const now = new Date();
      const raceEnd = new Date(new Date(race.sessions.race).getTime() + 3.5 * 3600 * 1000);
      const raceStart = new Date(race.sessions.race);
      const qualEnd = new Date(new Date(race.sessions.qual).getTime() + 2 * 3600 * 1000);
      const isLiveNow = now >= raceStart && now <= raceEnd;
      const isDone = now > raceEnd;
      const isQualiDone = now > qualEnd;

      // Aggiorna badge
      const badge = document.getElementById('livebadge-el');
      if (isLiveNow) {
        badge.textContent = '🔴 LIVE';
        badge.className = 'livebadge';
        startLive();
      } else if (isDone) {
        badge.textContent = '✅ Completato';
        badge.className = 'livebadge offline';
        stopLive();
        loadStoredResults(raceId);
      } else {
        badge.textContent = '⏳ In arrivo';
        badge.className = 'livebadge offline';
        stopLive();
      }

      // Aggiorna tab content corrente
      updateLiveUI();
      if (currentLiveTab === 'quali' && isQualiDone) renderStoredQualiResults();
      if (currentLiveTab === 'race' && isDone) renderStoredRaceResults();
      if (currentLiveTab === 'sprint' && isDone && race.sprint) renderStoredSprintResults();
    }

    async function loadStoredResults(raceId) {
      // Carica da Supabase i risultati salvati
      const { data } = await sb.from('race_results').select('*').eq('race_id', raceId).maybeSingle();
      if (data) {
        window._cachedResults = window._cachedResults || {};
        window._cachedResults[raceId] = data;
      }
      renderStoredQualiResults();
      renderStoredRaceResults();
      const race = CALENDAR_2026.find(r => r.id === raceId);
      if (race?.sprint) renderStoredSprintResults();
    }

    async function renderStoredQualiResults() {
      const el = document.getElementById('live-quali');
      if (!el) return;
      const raceId = selectedRaceId;
      if (!raceId) { el.innerHTML = '<div style="color:var(--t3);text-align:center;padding:16px">Seleziona una gara</div>'; return; }
      el.innerHTML = '<div style="text-align:center;padding:16px;color:var(--t3)">⟳ Caricamento...</div>';

      const res = await sb.from('race_results').select('*').eq('race_id', raceId).maybeSingle();
      const r = res?.data;
      // Considera qualifiche disponibili se c'è almeno qual_p1 o pole
      if (!r?.qual_p1 && !r?.pole) {
        el.innerHTML = '<div style="color:var(--t3);text-align:center;padding:16px;font-size:12px">Qualifiche non ancora disponibili</div>';
        return;
      }
      // Se qual_p1..p10 non sono popolati ma abbiamo pole, usiamo pole come griglia parziale
      const quali = r.qual_p1
        ? [r.qual_p1, r.qual_p2, r.qual_p3, r.qual_p4, r.qual_p5, r.qual_p6, r.qual_p7, r.qual_p8, r.qual_p9, r.qual_p10].filter(Boolean)
        : (r.pole ? [r.pole] : []);
      const myDrivers = new Set([fantState?.driver1, fantState?.driver2, fantState?.driver3].filter(Boolean));
      el.innerHTML = `<div style="font-size:10px;color:var(--t3);margin-bottom:8px">📋 Griglia di partenza — ${r.pole ? 'Pole: <strong style="color:var(--yellow)">' + r.pole + '</strong>' : ''}</div>` +
        quali.map((name, i) => {
          const drv = DRIVERS_2026.find(d => d.name === name);
          const isMine = myDrivers.has(name);
          return `<div class="posrow${i < 3 ? ' p' + (i + 1) : ''}${isMine ? ' myd' : ''}">
            <div class="posnum">${i + 1}</div>
            <div style="width:3px;height:28px;background:#${drv?.tc || '888'};border-radius:2px;flex-shrink:0"></div>
            <div style="flex:1"><div class="posname">${drv?.abbr || name} <span style="font-weight:400">${name.split(' ').slice(-1)[0]}</span>${isMine ? ' <span style="color:var(--red);font-size:9px">◀</span>' : ''}</div>
            <div class="posteam" style="color:#${drv?.tc || '888'};font-size:9px">${drv?.team || '—'}</div></div>
          </div>`;
        }).join('');
    }

    async function renderStoredRaceResults() {
      const el = document.getElementById('live-race-res');
      if (!el) return;
      const raceId = selectedRaceId;
      if (!raceId) { el.innerHTML = '<div style="color:var(--t3);text-align:center;padding:16px">Seleziona una gara</div>'; return; }
      el.innerHTML = '<div style="text-align:center;padding:16px;color:var(--t3)">⟳ Caricamento...</div>';

      const res = await sb.from('race_results').select('*').eq('race_id', raceId).maybeSingle();
      const r = res?.data;
      if (!r?.p1) {
        // Tenta auto-import da Jolpica
        el.innerHTML = '<div style="color:var(--t3);text-align:center;padding:16px;font-size:12px">Risultati gara non ancora disponibili<br><button class="btn btn-sm btn-g" style="margin-top:8px" onclick="autoImportJolpica(\'' + raceId + '\')">📡 Importa da Jolpica</button></div>';
        return;
      }
      const top10 = [r.p1, r.p2, r.p3, r.p4, r.p5, r.p6, r.p7, r.p8, r.p9, r.p10].filter(Boolean);
      const myDrivers = new Set([fantState?.driver1, fantState?.driver2, fantState?.driver3].filter(Boolean));
      const gapData = r.gap_data || {};
      // Tutti i piloti classificati (da gap_data se disponibile, altrimenti solo top10)
      let allPositioned = [];
      if (Object.keys(gapData).length > 0) {
        allPositioned = Object.entries(gapData).sort((a, b) => a[1].pos - b[1].pos).map(([name, d]) => ({ name, ...d }));
      } else {
        allPositioned = top10.map((name, i) => ({ name, pos: i + 1, gap: i === 0 ? 'WINNER' : '', laps: '—', status: 'Finished' }));
      }
      el.innerHTML = `
        <div style="font-size:10px;color:var(--t3);margin-bottom:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          ${r.fastest ? `<span>⚡ FL: <strong style="color:var(--purple)">${r.fastest.split(' ').pop()}</strong></span>` : ''}
          ${r.sc_count > 0 ? `<span>🚗 SC: ${r.sc_count}</span>` : ''}
          ${r.rf ? `<span>🚩 RF</span>` : ''}
          ${r.retires_count > 0 ? `<span>💥 DNF: ${r.retires_count}</span>` : ''}
        </div>` +
        allPositioned.map((d, i) => {
          const drv = DRIVERS_2026.find(x => x.name === d.name);
          const isMine = myDrivers.has(d.name);
          const isDNF = d.status && d.status !== 'Finished' && !d.status.startsWith('+') && !d.status.includes('Lap');
          const gapStr = d.gap === 'WINNER' ? '<span style="color:var(--gold);font-size:9px">WINNER</span>' :
            isDNF ? `<span style="color:#ff6060;font-size:9px">DNF</span>` :
              d.gap ? `<span style="font-size:9px;color:var(--t3)">${d.gap}</span>` : '';
          return `<div class="posrow${i < 3 ? ' p' + (i + 1) : ''}${isMine ? ' myd' : ''}" style="${isDNF ? 'opacity:.55' : ''}">
            <div class="posnum" style="${isDNF ? 'color:#ff6060' : ''}">P${d.pos}</div>
            <div style="width:3px;height:28px;background:#${drv?.tc || '888'};border-radius:2px;flex-shrink:0"></div>
            <div style="flex:1">
              <div class="posname">${drv?.abbr || d.name} <span style="font-weight:400">${d.name.split(' ').slice(-1)[0]}</span>${isMine ? ' <span style="color:var(--red);font-size:9px">◀</span>' : ''}</div>
              <div class="posteam" style="color:#${drv?.tc || '888'};font-size:9px">${drv?.team || '—'}</div>
            </div>
            <div style="text-align:right;font-size:9px">${gapStr}</div>
          </div>`;
        }).join('') +
        `<div style="margin-top:10px;display:flex;gap:6px">
          <button class="btn btn-sm btn-g" style="flex:1" onclick="showGPBreakdown('${raceId}')">📊 I miei punteggi</button>
          <button class="btn btn-sm btn-g" style="flex:1" onclick="openManualResultLive('${raceId}')">✏️ Modifica</button>
        </div>`;
    }

    async function renderStoredSprintResults() {
      const el = document.getElementById('live-sprint-res');
      if (!el) return;
      const raceId = selectedRaceId;
      const race = CALENDAR_2026.find(r => r.id === raceId);
      if (!race?.sprint) { el.innerHTML = '<div style="color:var(--t3);text-align:center;padding:16px">Nessuna sprint in questo weekend</div>'; return; }

      const res = await sb.from('race_results').select('*').eq('race_id', raceId).maybeSingle();
      const r = res?.data;
      if (!r?.sprint_win) {
        el.innerHTML = '<div style="color:var(--t3);text-align:center;padding:16px;font-size:12px">Risultati sprint non ancora disponibili</div>';
        return;
      }
      const sTop = [r.sprint_win, r.sprint_p2, r.sprint_p3].filter(Boolean);
      const myDrivers = new Set([fantState?.driver1, fantState?.driver2, fantState?.driver3].filter(Boolean));
      el.innerHTML = '<div style="font-size:10px;color:var(--purple);margin-bottom:8px">🟣 Sprint Race</div>' +
        sTop.map((name, i) => {
          const drv = DRIVERS_2026.find(d => d.name === name);
          const isMine = myDrivers.has(name);
          return `<div class="posrow p${i + 1}${isMine ? ' myd' : ''}">
            <div class="posnum">${i + 1}</div>
            <div style="width:3px;height:28px;background:#${drv?.tc || '888'};border-radius:2px;flex-shrink:0"></div>
            <div style="flex:1"><div class="posname">${drv?.abbr || name} <span style="font-weight:400">${name.split(' ').slice(-1)[0]}</span>${isMine ? ' <span style="color:var(--red);font-size:9px">◀</span>' : ''}</div>
            <div class="posteam" style="color:#${drv?.tc || '888'};font-size:9px">${drv?.team || '—'}</div></div>
          </div>`;
        }).join('');
    }

    // ══ AUTO-IMPORT JOLPICA (API gratuita, dati post-gara ~30min) ══
    async function autoImportJolpica(raceId) {
      const el = document.getElementById('live-race-res');
      if (el) el.innerHTML = '<div style="text-align:center;padding:16px;color:var(--t3)">⟳ Importazione da Jolpica...</div>';
      const race = CALENDAR_2026.find(r => r.id === raceId);
      if (!race) return;
      const year = 2026;
      const round = race.round;
      try {
        // Jolpica API - gratuita, dati post-gara
        const [raceRes, qualiRes] = await Promise.all([
          fetch(`${JOLPICA_BASE}/${year}/${round}/results.json?limit=25`),
          fetch(`${JOLPICA_BASE}/${year}/${round}/qualifying.json?limit=20`)
        ]);
        const raceJson = await raceRes.json();
        const qualiJson = await qualiRes.json();

        const raceResults = raceJson?.MRData?.RaceTable?.Races?.[0]?.Results || [];
        const qualiResults = qualiJson?.MRData?.RaceTable?.Races?.[0]?.QualifyingResults || [];

        if (!raceResults.length) {
          if (el) el.innerHTML = '<div style="color:var(--t3);text-align:center;padding:16px">Dati non ancora disponibili su Jolpica (di solito ~30min dopo la gara)</div>';
          return;
        }

        // Mappa nome Ergast → nome FANTA
        const matchJolpica = (ergastName) => {
          const full = `${ergastName.givenName} ${ergastName.familyName}`;
          const drv = DRIVERS_2026.find(d =>
            d.name.toLowerCase().includes(ergastName.familyName.toLowerCase()) ||
            ergastName.familyName.toLowerCase().includes(d.name.split(' ').slice(-1)[0].toLowerCase())
          );
          return drv?.name || full;
        };

        const top10race = raceResults.slice(0, 10).map(r => matchJolpica(r.Driver));
        const fastestDriver = raceResults.find(r => r.FastestLap?.rank === '1');
        const fastestName = fastestDriver ? matchJolpica(fastestDriver.Driver) : null;
        const dnfDrivers = raceResults.filter(r => r.status !== 'Finished' && !r.status.startsWith('+') && !r.status.includes('Lap')).map(r => matchJolpica(r.Driver));
        const dnfCount = dnfDrivers.length;
        const firstDNF = dnfDrivers[0] || null;

        const qualiTop10 = qualiResults.slice(0, 10).map(r => matchJolpica(r.Driver));
        const poleDriver = qualiTop10[0] || null;

        // Distacchi (gap) dal primo
        const gapData = {};
        raceResults.forEach((r, i) => {
          gapData[matchJolpica(r.Driver)] = {
            pos: i + 1,
            gap: i === 0 ? 'WINNER' : (r.Time?.time || r.status || '+?'),
            laps: r.laps || '—',
            status: r.status || 'Finished',
            points: r.points || '0'
          };
        });

        // Costruttori (somma punti F1)
        const teamPtsMap = {};
        TEAMS_2026.forEach(t => teamPtsMap[t] = 0);
        raceResults.forEach(r => {
          const dName = matchJolpica(r.Driver);
          const drv = DRIVERS_2026.find(d => d.name === dName);
          if (drv) teamPtsMap[drv.team] = (teamPtsMap[drv.team] || 0) + parseInt(r.points || 0);
        });
        const bestConstructor = Object.entries(teamPtsMap).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
        const teamPointsFantasy = {};
        TEAMS_2026.forEach(team => {
          const td = DRIVERS_2026.filter(d => d.team === team).map(d => d.name);
          teamPointsFantasy[team] = td.filter(d => [top10race[0], top10race[1], top10race[2], top10race[3], top10race[4], top10race[5], top10race[6], top10race[7], top10race[8], top10race[9]].includes(d)).length;
        });

        // Build result object
        const result = {
          race_id: raceId,
          pole: poleDriver,
          p1: top10race[0] || null, p2: top10race[1] || null, p3: top10race[2] || null,
          p4: top10race[3] || null, p5: top10race[4] || null, p6: top10race[5] || null,
          p7: top10race[6] || null, p8: top10race[7] || null, p9: top10race[8] || null, p10: top10race[9] || null,
          fastest: fastestName,
          qual_p1: qualiTop10[0] || null, qual_p2: qualiTop10[1] || null, qual_p3: qualiTop10[2] || null,
          qual_p4: qualiTop10[3] || null, qual_p5: qualiTop10[4] || null, qual_p6: qualiTop10[5] || null,
          qual_p7: qualiTop10[6] || null, qual_p8: qualiTop10[7] || null, qual_p9: qualiTop10[8] || null,
          qual_p10: qualiTop10[9] || null,
          p2_qual: qualiTop10[1] || null,
          retires_count: dnfCount,
          dnf_drivers: dnfDrivers.join(', '),
          first_dnf: firstDNF,
          rf: false, sc_count: 0,
          constructor_best: bestConstructor,
          team_points: teamPointsFantasy,
          gap_data: gapData,
          source: 'jolpica_auto',
          fetched_at: new Date().toISOString()
        };

        // Calc team_points
        const teamPoints = {};
        TEAMS_2026.forEach(team => {
          const td = DRIVERS_2026.filter(d => d.team === team).map(d => d.name);
          const topArr = [result.p1, result.p2, result.p3, result.p4, result.p5, result.p6, result.p7, result.p8, result.p9, result.p10];
          teamPoints[team] = td.filter(d => topArr.includes(d)).length;
        });
        result.team_points = teamPoints;

        // Salva su Supabase
        const { error } = await sb.from('race_results').upsert(result, { onConflict: 'race_id' });
        if (error) throw new Error(error.message);

        // Calcola punti per tutti gli utenti
        await computeAndSavePts(raceId, result);
        await autoUpdateMarketPrices(result);
        await sb.from('admin_log').insert({ action: `Auto-import Jolpica ${raceId}`, by_user: currentProfile?.nickname || 'system' });

        showToast('✅ Risultati importati e punti calcolati!', 'ok');
        renderStoredRaceResults();
        renderStoredQualiResults();
      } catch (e) {
        if (el) el.innerHTML = `<div style="color:var(--t3);text-align:center;padding:16px">❌ ${e.message}<br><button class="btn btn-sm btn-g" style="margin-top:8px" onclick="autoImportJolpica('${raceId}')">🔄 Riprova</button></div>`;
      }
    }

    // ══ LIVE VIA JOLPICA (sessione in corso) ══
    async function fetchLiveData() {
      const stateEl = document.getElementById('api-state');
      const badge = document.getElementById('livebadge-el');
      const race = CALENDAR_2026.find(r => r.id === selectedRaceId);
      if (!race) return;
      try {
        const now = new Date();
        const s = race.sessions;
        const raceS = new Date(s.race), raceE = new Date(raceS.getTime() + 3.5 * 3600 * 1000);
        const qualS = new Date(s.qual), qualE = new Date(qualS.getTime() + 2 * 3600 * 1000);
        const sprS = race.sprint ? new Date(s.spr) : null, sprE = sprS ? new Date(sprS.getTime() + 1.5 * 3600 * 1000) : null;
        const sqS = race.sprint ? new Date(s.sq) : null, sqE = sqS ? new Date(sqS.getTime() + 1.5 * 3600 * 1000) : null;

        let liveMode = 'idle';
        if (now >= raceS && now <= raceE) liveMode = 'race';
        else if (now >= qualS && now <= raceS) liveMode = 'quali';
        else if (sprS && now >= sprS && now <= sprE) liveMode = 'sprint';
        else if (sqS && now >= sqS && now <= sqE) liveMode = 'sprint_quali';

        liveData.liveMode = liveMode;

        // Se la sessione è appena finita, importa automaticamente
        if (liveMode === 'idle' && now > raceE) {
          const existingRes = await sb.from('race_results').select('race_id').eq('race_id', selectedRaceId).maybeSingle();
          if (!existingRes?.data) {
            await autoImportJolpica(selectedRaceId);
          }
          stopLive();
          return;
        }

        // Prova a leggere dal proxy Vercel (se configurato)
        const PROXY_URL = 'https://f1proxy-fanta-gdf2-git-main-casu878s-projects.vercel.app/api/live';
        let proxyData = null;
        try {
          const pr = await fetch(PROXY_URL, { signal: AbortSignal.timeout(4000) });
          if (pr.ok) proxyData = await pr.json();
        } catch (_) { }

        if (proxyData && !proxyData.error && proxyData.drivers && Object.keys(proxyData.drivers).length > 0) {
          // Usa dati proxy
          const modeLabel = { race: '🔴 GARA LIVE', quali: '🟢 QUALI LIVE', sprint: '🟣 SPRINT LIVE', sprint_quali: '🟢 SPQ LIVE', idle: '⬤ LIVE' };
          badge.className = 'livebadge' + (liveMode === 'idle' ? ' offline' : '');
          badge.textContent = modeLabel[liveMode] || '⬤ LIVE';
          liveData.lap = proxyData.lap || 0;
          liveData.total = proxyData.totalLaps || 0;
          liveData.sc = proxyData.scCount || 0;
          liveData.rf = proxyData.rfCount || 0;
          liveData.dnf = proxyData.dnfCount || 0;
          liveData.status = proxyData.trackStatus || 'green';
          liveData.positions = Object.entries(proxyData.drivers || {}).map(([num, d]) => ({
            pos: d.pos, name: matchDriverName(d.name || ''), abbr: d.abbr || num,
            team: d.team || '—', num, color: d.color || '888',
            isMine: [fantState?.driver1, fantState?.driver2, fantState?.driver3].includes(matchDriverName(d.name || '')),
            gap: d.gap, interval: d.interval, pits: d.pits || 0, isDNF: false
          })).sort((a, b) => a.pos - b.pos);
          if (stateEl) stateEl.textContent = `✅ Proxy · ${new Date().toLocaleTimeString('it-IT')}`;
        } else {
          // Fallback: mostra "sessione in corso" senza dati real-time
          badge.className = 'livebadge' + (liveMode === 'idle' ? ' offline' : '');
          badge.textContent = liveMode !== 'idle' ? '🔴 LIVE (senza dati)' : '⬤ OFFLINE';
          liveData.positions = [];
          if (stateEl) stateEl.textContent = `⚠️ Proxy offline — dati non disponibili`;
        }

        document.getElementById('sync-time').textContent = new Date().toLocaleTimeString('it-IT');
        document.getElementById('lapcur').textContent = liveData.lap || '—';
        document.getElementById('laptot').textContent = liveData.total || '—';

        // Auto-import quando gara finisce
        if (liveMode === 'race' && proxyData?.sessionStatus === 'Finished') {
          await autoImportJolpica(selectedRaceId);
          stopLive();
        }

      } catch (err) {
        if (badge) { badge.className = 'livebadge offline'; badge.textContent = '⬤ OFFLINE'; }
        if (stateEl) stateEl.textContent = `⚠️ ${err.message}`;
      }
      updateLiveUI();
    }

    function updateLiveUI() {
      document.getElementById('lapcur').textContent = liveData.lap || '—';
      document.getElementById('laptot').textContent = liveData.total || '—';
      document.getElementById('lv-dnf').textContent = liveData.dnf || 0;
      document.getElementById('lv-sc').textContent = liveData.sc || 0;
      document.getElementById('lv-rf').textContent = liveData.rf || 0;
      const trkBadge = document.getElementById('trkstatus');
      if (liveData.status === 'sc') { trkBadge.textContent = '🚗 Safety Car'; trkBadge.className = 'stsbadge stsY'; }
      else if (liveData.status === 'vsc') { trkBadge.textContent = '🟡 VSC'; trkBadge.className = 'stsbadge stsY'; }
      else if (liveData.status === 'red') { trkBadge.textContent = '🚩 Red Flag'; trkBadge.className = 'stsbadge stsR'; }
      else { trkBadge.textContent = '🟢 Verde'; trkBadge.className = 'stsbadge stsG'; }

      if (currentLiveTab === 'pos') {
        const posEl = document.getElementById('live-pos');
        const mode = liveData.liveMode || 'idle';
        const titleMap = { race: '🏎️ Posizioni Gara', quali: '🏁 Posizioni Qualifiche', sprint: '🟣 Posizioni Sprint', sprint_quali: '🟢 Sprint Qualifying', idle: '📡 Ultima sessione' };
        const stitleEl = document.querySelector('#live-pos-tab .stitle');
        if (stitleEl) stitleEl.textContent = titleMap[mode] || '🔴 Live';
        if (posEl) posEl.innerHTML = liveData.positions?.length
          ? liveData.positions.map(d => `
          <div class="posrow${d.pos <= 3 ? ' p' + d.pos : ''}${d.isMine ? ' myd' : ''}">
            <div class="posnum" style="${d.isDNF ? 'color:var(--red)' : ''}">${d.pos}</div>
            <div style="width:3px;height:32px;background:#${d.color};border-radius:2px;flex-shrink:0;opacity:${d.isDNF ? .4 : 1}"></div>
            <div style="flex:1">
              <div class="posname">${d.abbr} <span style="font-weight:400">${d.name.split(' ').slice(-1)[0]}</span>${d.isMine ? ' <span style="color:var(--red);font-size:9px">◀</span>' : ''}${d.isDNF ? ' <span style="color:var(--red);font-size:9px">DNF</span>' : ''}</div>
              <div class="posteam" style="color:#${d.color};font-size:9px">${d.team}${d.pits > 0 && mode === 'race' ? ' · 🔧' + d.pits : ''}</div>
            </div>
            ${d.gap != null ? `<div style="text-align:right;min-width:48px"><div style="font-size:11px;color:var(--t2)">${d.pos === 1 ? 'LEADER' : typeof d.gap === 'number' ? '+' + d.gap.toFixed(3) : d.gap}</div></div>` : ''}
          </div>`).join('')
          : `<div style="text-align:center;padding:24px;color:var(--t3);font-size:12px">📡 Nessun dato live.<br><span style="font-size:11px">I dati appaiono durante qualifiche, sprint e gara.</span></div>`;
      }
      if (currentLiveTab === 'gaps') {
        const gapsEl = document.getElementById('live-gaps');
        if (gapsEl) gapsEl.innerHTML = liveData.positions?.length
          ? `<table class="inter-table"><tr style="color:var(--t3);font-size:10px;letter-spacing:1px"><td>P</td><td>PILOTA</td><td>GAP</td><td>PIT</td></tr>${liveData.positions.map(d => `<tr><td style="font-weight:900;color:var(--t3)">${d.pos}</td><td style="font-weight:700;color:#${d.color}">${d.abbr}</td><td style="color:var(--yellow)">${d.pos === 1 ? '—' : typeof d.gap === 'number' ? '+' + d.gap.toFixed(3) : (d.gap || '—')}</td><td style="color:var(--t3)">${d.pits || 0}</td></tr>`).join('')}</table>`
          : '<div style="color:var(--t3);text-align:center;padding:16px">Nessun dato</div>';
      }
      if (currentLiveTab === 'fanta') updateLiveFantaLB();
    }

    function checkAndRevealQualiTab() {
      // Tutti i tab sono sempre visibili, nessuna logica necessaria
    }

    function startLive() {
      fetchLiveData();
      if (liveInterval) clearInterval(liveInterval);
      liveInterval = setInterval(fetchLiveData, 5000);
    }
    function stopLive() { if (liveInterval) { clearInterval(liveInterval); liveInterval = null; } }

    // renderQualiResults rimane come alias per compatibilità
    function renderQualiResults() { renderStoredQualiResults(); }

    // Dummy revealQualiTab - non più necessaria
    function revealQualiTab() { }


    // Forza il countdown a mostrare "GARA TRA" quando le qualifiche sono finite secondo OpenF1
    function forceCountdownToRace() {
      const next = getNextRace(); if (!next) return;
      const now = new Date();
      const raceStart = new Date(next.sessions.race);
      if (now >= raceStart) return; // già in gara
      const elLabel = document.getElementById('cd-session-label');
      const elGrid = document.getElementById('cd-grid');
      if (!elLabel || !elGrid) return;
      const diff = raceStart - now;
      if (diff <= 0) return;
      const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000),
        m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
      elLabel.innerHTML = '<span style="font-size:10px;letter-spacing:3px;color:var(--t3);text-transform:uppercase">⏱ GARA TRA</span>';
      elGrid.style.display = 'grid';
      const el = id => document.getElementById(id);
      if (el('cdd')) el('cdd').textContent = String(d).padStart(2, '0');
      if (el('cdh')) el('cdh').textContent = String(h).padStart(2, '0');
      if (el('cdm')) el('cdm').textContent = String(m).padStart(2, '0');
      if (el('cds')) el('cds').textContent = String(s).padStart(2, '0');
    }

