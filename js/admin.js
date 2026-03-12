// ══════════════════ ADMIN ══════════════════

    async function renderAdminLog() {
      if (!sb) return;
      const { data } = await sb.from('admin_log').select('*').order('ts', { ascending: false }).limit(15);
      const el = document.getElementById('adminlog');
      if (el) el.innerHTML = (data || []).map(l => `
    <div class="srow">
      <span class="sl" style="font-size:10px;min-width:60px">${new Date(l.ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
      <span style="font-size:12px">${l.action}</span>
    </div>`).join('') || '<div style="color:var(--t3);font-size:12px">Nessuna attività.</div>';
    }

    async function openMod(type) {
      document.getElementById('moverlay').classList.remove('hidden');
      const c = document.getElementById('mcontent');

      if (type === 'users') {
        const { data: users } = await sb.from('profiles').select('*').order('total_pts', { ascending: false });
        c.innerHTML = `<span class="mclose" onclick="closeMod()">✕</span>
      <div class="mtitle">👥 Utenti Lega (${users?.length || 0})</div>
      <div class="status-banner sb-info">Codice accesso: <strong>${LEAGUE_CODE}</strong></div>
      ${(users || []).map(u => `
        <div class="lbrow" style="margin-bottom:6px">
          <div class="av" style="background:${u.color};width:28px;height:28px;font-size:13px;flex-shrink:0">${u.avatar}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:13px">${u.nickname}</div>
            <div style="font-size:10px;color:var(--t3)">${u.role} · ${u.total_pts} pts · ${u.gps_done || 0} GP</div>
          </div>
          <div style="display:flex;gap:5px;align-items:center">
            ${u.role !== 'admin' ? `<button class="btn btn-sm btn-g" onclick="promoteUser('${u.id}')">Admin</button>` : '<span style="font-size:10px;color:var(--red);font-weight:700">ADMIN</span>'}
            <button class="btn btn-sm btn-no" onclick="resetUserPts('${u.id}','${u.nickname}')">Reset</button>
          </div>
        </div>`).join('')}`;

      } else if (type === 'scores') {
        c.innerHTML = `<span class="mclose" onclick="closeMod()">✕</span>
      <div class="mtitle">🧮 Sistema Punteggi Completo</div>
      <div class="stitle">FANTASY — GARA (PUNTI)</div>
      ${Object.entries(RACE_PTS).map(([pos, pts]) => `<div class="srow"><span class="sl">P${pos}</span><span class="sv" style="color:var(--green)">+${pts} pts</span></div>`).join('')}
      <div class="stitle">FANTASY — GARA (CREDITI)</div>
      ${Object.entries(DRIVER_EARNINGS).map(([pos, cr]) => `<div class="srow"><span class="sl">P${pos}</span><span class="sv" style="color:var(--yellow)">+${cr} cr</span></div>`).join('')}
      <div class="stitle">FANTASY — QUALIFICA</div>
      <div class="srow"><span class="sl">Entrata Q2</span><span class="sv" style="color:var(--green)">+3 pts / +5 cr</span></div>
      <div class="srow"><span class="sl">Entrata Q3</span><span class="sv" style="color:var(--green)">+5 pts / +10 cr</span></div>
      <div class="srow"><span class="sl">Pole Position</span><span class="sv" style="color:var(--green)">+7 pts / +15 cr</span></div>
      <div class="stitle">MALUS</div>
      <div class="srow"><span class="sl">DNF gara</span><span class="sv" style="color:var(--red)">-10 pts / -10 cr</span></div>
      <div class="srow"><span class="sl">Squalificato</span><span class="sv" style="color:var(--red)">-20 pts</span></div>
      <div class="srow"><span class="sl">Penalità</span><span class="sv" style="color:var(--red)">-8 pts</span></div>
      <div class="stitle">SCUDERIA</div>
      <div class="srow"><span class="sl">Ogni pilota top10</span><span class="sv" style="color:var(--green)">+5 pts / +5 cr</span></div>
      <div class="srow"><span class="sl">Pos guadagnata</span><span class="sv" style="color:var(--green)">+1 pt / pos</span></div>
      <div class="srow"><span class="sl">Pos persa</span><span class="sv" style="color:var(--red)">-1 pt / pos</span></div>
      <div class="srow"><span class="sl">Pilota DNF</span><span class="sv" style="color:var(--red)">-5 pts / pilota</span></div>
      <div class="stitle">FANTASY — SPRINT</div>
      ${Object.entries(SPRINT_PTS).map(([pos, pts]) => `<div class="srow"><span class="sl">Sprint P${pos}</span><span class="sv" style="color:var(--purple)">+${pts} pts</span></div>`).join('')}
      <div class="stitle">PRONOSTICI — PUNTI</div>
      <div class="srow"><span class="sl">Vincitore esatto</span><span class="sv" style="color:var(--green)">+${PRED.win_exact} pts</span></div>
      <div class="srow"><span class="sl">Vincitore nel podio (non P1)</span><span class="sv" style="color:var(--yellow)">+${PRED.win_podium} pts</span></div>
      <div class="srow"><span class="sl">Podio P2/P3 posizione esatta</span><span class="sv" style="color:var(--green)">+${PRED.pos_exact} pts</span></div>
      <div class="srow"><span class="sl">Podio P2/P3 pos sbagliata</span><span class="sv" style="color:var(--yellow)">+${PRED.pos_in_podium} pts</span></div>
      <div class="srow"><span class="sl">Top10 (4-10) pilota corretto</span><span class="sv" style="color:var(--green)">+${PRED.top10_correct} pts</span></div>
      <div class="srow"><span class="sl">Safety Car corretta</span><span class="sv" style="color:var(--green)">+${PRED.sc_exact} pts</span></div>
      <div class="srow"><span class="sl">Bandiera Rossa corretta</span><span class="sv" style="color:var(--green)">+${PRED.rf_exact} pts</span></div>
      <div class="srow"><span class="sl">Prima scuderia pit stop</span><span class="sv" style="color:var(--green)">+${PRED.fastest_pit} pts</span></div>
      <div class="srow"><span class="sl">Giro Veloce</span><span class="sv" style="color:var(--green)">+${PRED.fastest} pts</span></div>
      <div class="srow"><span class="sl">Miglior rimonta</span><span class="sv" style="color:var(--green)">+${PRED.best_comeback} pts</span></div>
      <div class="srow"><span class="sl">Pole Position</span><span class="sv" style="color:var(--green)">+${PRED.pole_exact} pts</span></div>
      <div class="srow"><span class="sl">Costruttore top weekend</span><span class="sv" style="color:var(--green)">+${PRED.constructor_perf} pts</span></div>
      <div class="srow"><span class="sl">Ritiri esatti</span><span class="sv" style="color:var(--green)">+${PRED.retires_exact} pts</span></div>
      <div class="srow"><span class="sl">Ritiri ±1</span><span class="sv" style="color:var(--yellow)">+${PRED.retires_close} pts</span></div>
      <div class="stitle">PRONOSTICI — CREDITI</div>
      <div class="srow"><span class="sl">Vincitore esatto</span><span class="sv" style="color:var(--yellow)">+${PRED_CR.win_exact} cr</span></div>
      <div class="srow"><span class="sl">Podio posizione esatta</span><span class="sv" style="color:var(--yellow)">+${PRED_CR.podium_exact} cr</span></div>
      <div class="srow"><span class="sl">Podio posizione sbagliata</span><span class="sv" style="color:var(--yellow)">+${PRED_CR.podium_wrong_pos} cr</span></div>
      <div class="srow"><span class="sl">Top10 corretto</span><span class="sv" style="color:var(--yellow)">+${PRED_CR.top10_correct} cr</span></div>
      <div class="srow"><span class="sl">Safety Car corretta</span><span class="sv" style="color:var(--yellow)">+${PRED_CR.sc_correct} cr</span></div>
      <div class="srow"><span class="sl">Bandiera Rossa corretta</span><span class="sv" style="color:var(--yellow)">+${PRED_CR.rf_correct} cr</span></div>
      <div class="srow"><span class="sl">Prima scuderia pit stop</span><span class="sv" style="color:var(--yellow)">+${PRED_CR.fastest_pit} cr</span></div>
      <div class="srow"><span class="sl">Giro Veloce</span><span class="sv" style="color:var(--yellow)">+${PRED_CR.fastest_lap} cr</span></div>
      <div class="srow"><span class="sl">Miglior rimonta</span><span class="sv" style="color:var(--yellow)">+${PRED_CR.best_comeback} cr</span></div>
      <div class="srow"><span class="sl">Pole Position</span><span class="sv" style="color:var(--yellow)">+${PRED_CR.pole_correct} cr</span></div>
      <div class="srow"><span class="sl">Costruttore top weekend</span><span class="sv" style="color:var(--yellow)">+${PRED_CR.constructor_perf} cr</span></div>
      <div class="srow"><span class="sl">Ritiri esatti</span><span class="sv" style="color:var(--yellow)">+${PRED_CR.retires_exact} cr</span></div>
      <div class="srow"><span class="sl">Ritiri ±1</span><span class="sv" style="color:var(--yellow)">+${PRED_CR.retires_close} cr</span></div>
      <div class="srow"><span class="sl">🎯 Perfect Weekend</span><span class="sv" style="color:var(--purple)">+${PRED.perfect} pts</span></div>
      <div class="srow"><span class="sl">🌟 Super Perfect</span><span class="sv" style="color:var(--gold)">+${PRED.super_perfect} pts</span></div>`;

      } else if (type === 'results') {
        c.innerHTML = `<span class="mclose" onclick="closeMod()">✕</span>
      <div class="mtitle">🔄 Risultati GP</div>
      <div class="status-banner sb-info">Clicca su un GP per inserire i risultati manualmente o importare da OpenF1.</div>
      <div class="status-banner" style="background:rgba(255,165,0,.08);border-color:rgba(255,165,0,.3);font-size:10px;color:#ffaa44">⚠️ Se vedi errori schema (p2_qual), vai su Supabase → SQL Editor ed esegui: <strong>NOTIFY pgrst, 'reload schema';</strong></div>
      ${CALENDAR_2026.map(r => `
        <div class="rcard">
          <div style="font-size:20px">${r.flag}</div>
          <div style="flex:1;min-width:100px">
            <div style="font-weight:700;font-size:13px">R${r.round} · ${r.name}</div>
            <div style="font-size:10px;color:var(--t2)">${fmtIt(r.sessions.race)}</div>
          </div>
          <div style="display:flex;gap:5px">
            <button class="btn btn-ok btn-sm" onclick="autoImportResult('${r.id}')">🤖 API</button>
            <button class="btn btn-g btn-sm" onclick="openManualResult('${r.id}')">✏️</button>
          </div>
        </div>`).join('')}`;

      } else if (type === 'prices') {
        c.innerHTML = `<span class="mclose" onclick="closeMod()">✕</span>
      <div class="mtitle">📈 Valori di Mercato</div>
      <div class="status-banner sb-info" style="font-size:11px">
        I valori si aggiornano <strong>automaticamente</strong> dopo ogni GP premendo "Calcola &amp; Salva GP".<br>
        <span style="color:var(--gold)">Piloti</span>: variazione basata su fascia + posizione finale · <span style="color:var(--gold)">Scuderie</span>: classifica costruttori weekend (somma punti F1 reali dei 2 piloti).<br>
        DNF pilota = sempre −2 · Modifica manuale disponibile qui sotto.
      </div>

      <div style="font-size:9px;letter-spacing:2px;color:var(--red);text-transform:uppercase;margin:14px 0 8px;font-weight:900">👤 PILOTI</div>

      ${['top', 'mid', 'low'].map(tier => `
        <div style="display:flex;align-items:center;gap:6px;margin:10px 0 5px">
          <div style="font-size:9px;letter-spacing:2px;color:var(--t3);text-transform:uppercase">${tier === 'top' ? '🥇 Fascia TOP — aspettativa podio/top5' : tier === 'mid' ? '🥈 Fascia MEDIA — aspettativa top10' : '🥉 Fascia BASSA — aspettativa punti'}</div>
        </div>
        <div style="background:var(--s2);border-radius:8px;padding:8px;margin-bottom:6px">
          <div style="font-size:9px;color:var(--t3);margin-bottom:5px">
            ${tier === 'top' ? 'P1+3 P2+2 P3+2 P4+1 P5-P7=0 P8-1 P9-1 P10-2 P11-13=-3 P14=-3 P15-17=-4 P18-22=-5' :
            tier === 'mid' ? 'P1+5 P2+4 P3+4 P4+4 P5+3 P6+2 P7+2 P8+1 P9-10=0 P11-14=0 P15-1 P16-1 P17-18=-2 P19-20=-3 P21-22=-4' :
              'P1+7 P2+7 P3+6 P4+6 P5+5 P6+5 P7+4 P8+4 P9+3 P10+2 P11+1 P12-13=+1 P14=0 P15-19=0 P20-22=-1'}
            · DNF −2
          </div>
          ${DRIVERS_2026.filter(d => DRIVER_TIERS[tier].includes(d.name)).map(d => `
          <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)">
            <div style="width:3px;height:28px;background:#${d.tc};border-radius:2px;flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:800;font-size:12px">${d.name.split(' ').pop()}</div>
              <div style="font-size:9px;color:var(--t3)">${d.team}</div>
            </div>
            <div style="font-size:10px;color:var(--t3);margin-right:4px">stip ${d.salary}cr</div>
            <input type="number" id="pr_${d.abbr}" value="${d.price}" min="5" max="120"
              style="width:54px;padding:5px;background:var(--s1);border:1px solid var(--border2);border-radius:6px;color:var(--yellow);text-align:center;font-weight:900;font-family:'Exo 2',sans-serif;font-size:15px;outline:none">
            <span style="font-size:10px;color:var(--t3)">cr</span>
          </div>`).join('')}
        </div>
      `).join('')}

      <div style="font-size:9px;letter-spacing:2px;color:var(--red);text-transform:uppercase;margin:16px 0 8px;font-weight:900">🏎️ SCUDERIE</div>
      <div style="font-size:11px;color:var(--t2);margin-bottom:10px">
        La classifica costruttori del weekend si calcola come nella F1 reale: <strong>somma punti dei 2 piloti</strong>.
        La variazione dipende dalla fascia e dalla posizione in quella classifica.
      </div>

      ${['top', 'mid', 'low'].map(tier => `
        <div style="display:flex;align-items:center;gap:6px;margin:8px 0 5px">
          <div style="font-size:9px;letter-spacing:2px;color:var(--t3);text-transform:uppercase">${tier === 'top' ? '🥇 Fascia TOP — Mercedes McLaren Ferrari Red Bull' : tier === 'mid' ? '🥈 Fascia MEDIA — Alpine Haas Williams' : '🥉 Fascia BASSA — Audi Aston Martin Cadillac Racing Bulls'}</div>
        </div>
        <div style="background:var(--s2);border-radius:8px;padding:8px;margin-bottom:6px">
          <div style="font-size:9px;color:var(--t3);margin-bottom:5px">
            ${tier === 'top' ? '1°+2 2°+2 3°+1 4°=0 5°-1 6°-2 7°-3 8-9-10=-3 11°=-3' :
                  tier === 'mid' ? '1°+4 2°+3 3°+2 4°+2 5°+1 6°=0 7-8=0 9°-1 10°-2 11°=-2' :
                    '1°+5 2°+4 3°+4 4°+3 5°+2 6°+1 7-8=+1 9°=0 10°=0 11°=-1'}
          </div>
          ${TEAMS_2026.filter(t => TEAM_TIERS[tier].includes(t)).map(t => `
          <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)">
            <div style="flex:1;font-weight:800;font-size:12px">${t}</div>
            <div style="font-size:10px;color:var(--t3);margin-right:4px">stip ${TEAM_SALARIES_2026[t] || 0}cr</div>
            <input type="number" id="pr_team_${t.replace(/ /g, '_')}" value="${TEAM_PRICES_2026[t] || 20}" min="5" max="150"
              style="width:54px;padding:5px;background:var(--s1);border:1px solid var(--border2);border-radius:6px;color:var(--yellow);text-align:center;font-weight:900;font-family:'Exo 2',sans-serif;font-size:15px;outline:none">
            <span style="font-size:10px;color:var(--t3)">cr</span>
          </div>`).join('')}
        </div>
      `).join('')}

      <button class="btn btn-r btn-w" style="margin-top:14px" onclick="savePrices()">💾 Salva Modifiche Manuali</button>`;

      } else if (type === 'calcola') {
        await openCalcolaPanel(c);

      } else if (type === 'economy') {
        await openEconomyPanel(c);
      } else if (type === 'auction') {
        await openAuctionPanel(c);
        startAuctionRealtime();
      }
    }

    // ══════════════════ PANNELLO CALCOLA GP ══════════════════

    async function openCalcolaPanel(c) {
      // Carica i risultati esistenti per mostrare stato GP
      const { data: existingResults } = await sb.from('race_results').select('race_id,p1,p2,p3,source,fetched_at');
      const resMap = {};
      (existingResults || []).forEach(r => resMap[r.race_id] = r);

      c.innerHTML = `<span class="mclose" onclick="closeMod()">✕</span>
    <div class="mtitle">🤖 Calcola Punteggi GP</div>
    <div class="status-banner sb-info" style="font-size:11px">
      📡 I dati gara vengono importati da <strong>OpenF1 API</strong> automaticamente.<br>
      ✏️ Solo il <strong>Miglior Risultato Weekend</strong> va inserito manualmente.
    </div>

    <div class="fg" style="margin-top:12px">
      <label style="font-size:11px;font-weight:700;letter-spacing:1px;color:var(--t3);text-transform:uppercase">Seleziona GP</label>
      <select class="fi fi-sel" id="calcola-race" onchange="onCalcolaRaceChange()">
        ${CALENDAR_2026.map(r => {
        const res = resMap[r.id];
        const badge = res ? ' ✅' : '';
        return `<option value="${r.id}">${r.flag} R${r.round} · ${r.name}${badge}</option>`;
      }).join('')}
      </select>
    </div>

    <div id="calcola-result-preview" style="margin:10px 0;min-height:40px"></div>

    <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:700;color:var(--yellow);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">✏️ Miglior Risultato Weekend (solo manuale)</div>
      <div style="font-size:11px;color:var(--t2);margin-bottom:8px">Inserisci il pilota con il miglior risultato complessivo del weekend (usato per il calcolo pronostici).</div>
      <select class="fi fi-sel" id="calcola-best-result">
        <option value="">— Seleziona pilota —</option>
        ${DRIVERS_2026.map(d => `<option value="${d.name}" style="color:#${d.tc}">${d.abbr} · ${d.name}</option>`).join('')}
      </select>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <button class="btn btn-ok btn-w" id="calcola-fetch-btn" onclick="runFetchOpenF1()">
        📡 Fetch da Jolpica
      </button>
      <button class="btn btn-r btn-w" id="calcola-save-btn" onclick="runCalcolaGP()" disabled>
        🧮 Calcola &amp; Salva
      </button>
    </div>

    <div id="calcola-status" style="font-size:12px;color:var(--t2);min-height:20px"></div>

    <div style="border-top:1px solid var(--border);margin-top:16px;padding-top:12px">
      <div style="font-size:11px;font-weight:700;color:var(--t3);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">🔢 Ricalcola Tutto</div>
      <div class="status-banner sb-warn" style="font-size:11px;margin-bottom:8px">⚠️ Ricalcola tutti i GP con risultati già salvati. Azzera i punti attuali!</div>
      <button class="btn btn-g btn-w" id="recalc-btn" onclick="recalcAllPts()">🔢 Ricalcola Tutti i GP</button>
      <div id="recalc-status" style="margin-top:8px;font-size:12px;color:var(--t2)"></div>
    </div>`;

      // Pre-seleziona il prossimo GP
      const next = getNextRace();
      if (next) {
        document.getElementById('calcola-race').value = next.id;
        onCalcolaRaceChange(resMap);
      } else {
        onCalcolaRaceChange(resMap);
      }

      // Salva resMap per uso in onchange
      window._calcolaResMap = resMap;
    }

    function onCalcolaRaceChange(resMap) {
      const rm = resMap || window._calcolaResMap || {};
      const raceId = document.getElementById('calcola-race')?.value;
      if (!raceId) return;
      const res = rm[raceId];
      const preview = document.getElementById('calcola-result-preview');
      const saveBtn = document.getElementById('calcola-save-btn');
      const bestSel = document.getElementById('calcola-best-result');

      if (res) {
        // Pre-popola il miglior risultato se già salvato
        if (res.best_weekend_driver && bestSel) bestSel.value = res.best_weekend_driver;
        preview.innerHTML = `<div class="status-banner sb-info" style="font-size:11px">
      ✅ Dati già presenti · <strong>P1:</strong>${res.p1 || '?'} <strong>P2:</strong>${res.p2 || '?'} <strong>P3:</strong>${res.p3 || '?'}
      ${res.best_weekend_driver ? `· <strong>Best:</strong>${res.best_weekend_driver}` : ''}
      <div style="color:var(--t3);font-size:10px;margin-top:2px">Fonte: ${res.source || 'manuale'} · ${res.fetched_at ? new Date(res.fetched_at).toLocaleString('it-IT') : ''}</div>
    </div>`;
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '🧮 Ricalcola & Salva'; }
      } else {
        preview.innerHTML = `<div style="font-size:11px;color:var(--t3);padding:6px">⚪ Nessun dato ancora. Usa "Fetch da OpenF1" per importare.</div>`;
        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '🧮 Calcola & Salva'; }
      }
    }

    // Stato temporaneo fetch
    let _fetchedResult = null;

    async function runFetchOpenF1() {
      const raceId = document.getElementById('calcola-race')?.value;
      if (!raceId) return;
      const statusEl = document.getElementById('calcola-status');
      const fetchBtn = document.getElementById('calcola-fetch-btn');
      const saveBtn = document.getElementById('calcola-save-btn');
      const preview = document.getElementById('calcola-result-preview');

      fetchBtn.disabled = true;
      fetchBtn.textContent = '⟳ Connessione Jolpica...';
      statusEl.textContent = '🔍 Ricerca risultati su Jolpica API...';

      const result = await fetchOpenF1RaceResult(raceId);
      fetchBtn.disabled = false;
      fetchBtn.textContent = '📡 Fetch da Jolpica';

      if (!result) {
        statusEl.innerHTML = '<span style="color:var(--red)">❌ Dati non disponibili. La gara potrebbe non essere ancora su Jolpica (~30min dopo la fine).</span>';
        return;
      }

      _fetchedResult = result;
      saveBtn.disabled = false;
      saveBtn.textContent = '🧮 Calcola & Salva';

      // Mostra anteprima risultati
      const top10 = [result.p1, result.p2, result.p3, result.p4, result.p5, result.p6, result.p7, result.p8, result.p9, result.p10].filter(Boolean);
      preview.innerHTML = `
    <div style="background:var(--s2);border:1px solid var(--green);border-radius:8px;padding:10px;font-size:11px">
      <div style="color:var(--green);font-weight:700;margin-bottom:6px">✅ Dati OpenF1 ricevuti</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:3px;margin-bottom:6px">
        ${top10.map((n, i) => `<div style="color:${i < 3 ? 'var(--gold)' : 'var(--t2)'}">P${i + 1}: ${n.split(' ').pop()}</div>`).join('')}
      </div>
      <div style="color:var(--t2)">⚡ Giro veloce: <strong>${result.fastest || '?'}</strong></div>
      <div style="color:var(--t2)">🚗 Safety Car: <strong>${result.sc_count}x</strong> · Bandiera rossa: <strong>${result.rf ? 'Sì' : 'No'}</strong></div>
      <div style="color:var(--t2)">❌ DNF: <strong>${result.dnf_drivers || 'nessuno'}</strong></div>
      ${result.pole && result.pole !== result.p1 ? `<div style="color:var(--t2)">🏁 Pole: <strong>${result.pole}</strong></div>` : ''}
    </div>`;
      statusEl.innerHTML = '<span style="color:var(--green)">✅ Dati pronti. Inserisci il Miglior Risultato e clicca "Calcola & Salva".</span>';
    }

    async function runCalcolaGP() {
      const raceId = document.getElementById('calcola-race')?.value;
      const bestResult = document.getElementById('calcola-best-result')?.value || null;
      const statusEl = document.getElementById('calcola-status');
      const saveBtn = document.getElementById('calcola-save-btn');

      if (!raceId) return;

      // Usa i dati fetchati oppure quelli già in DB
      let result = _fetchedResult && _fetchedResult.race_id === raceId ? _fetchedResult : null;

      if (!result) {
        // Cerca in DB
        const { data: existing } = await sb.from('race_results').select('*').eq('race_id', raceId).maybeSingle();
        if (!existing) {
          statusEl.innerHTML = '<span style="color:var(--red)">❌ Nessun dato disponibile. Esegui prima il Fetch.</span>';
          return;
        }
        result = existing;
      }

      // Aggiungi miglior risultato manuale
      result.best_weekend_driver = bestResult;

      saveBtn.disabled = true;
      saveBtn.textContent = '⟳ Salvataggio...';
      statusEl.textContent = '💾 Salvataggio risultati...';

      // Salva risultato
      const { error } = await sb.from('race_results').upsert(sanitizeResult(result), { onConflict: 'race_id' });
      if (error) {
        statusEl.innerHTML = `<span style="color:var(--red)">❌ ${error.message}</span>`;
        saveBtn.disabled = false;
        saveBtn.textContent = '🧮 Calcola & Salva';
        return;
      }

      statusEl.textContent = '🧮 Calcolo punteggi Fantasy & Pronostici...';

      // Calcola e salva punti
      const log = await computeAndSavePts(raceId, result);

      // Auto-aggiorna i valori di mercato dopo il GP
      const priceLog = await autoUpdateMarketPrices(result);
      if (priceLog.length > 0) {
        await sb.from('admin_log').insert({
          action: 'Valori mercato aggiornati dopo ' + raceId + ': ' + priceLog.slice(0, 5).join(', ') + (priceLog.length > 5 ? ' ...(+' + (priceLog.length - 5) + ' altri)' : ''),
          by_user: currentProfile?.nickname || 'system'
        });
      }

      await sb.from('admin_log').insert({
        action: `Calcola GP ${raceId} — best_result: ${bestResult || '—'} (${result.source || 'openf1'})`,
        by_user: currentProfile?.nickname || 'admin'
      });

      saveBtn.disabled = false;
      saveBtn.textContent = '🧮 Calcola & Salva';

      // Aggiorna preview
      if (window._calcolaResMap) {
        window._calcolaResMap[raceId] = result;
        onCalcolaRaceChange();
      }

      statusEl.innerHTML = `<span style="color:var(--green)">✅ GP calcolato! ${log || ''} Aggiornamento classifica...</span>`;
      showToast('✅ GP calcolato e salvato!', 'gold');
      _fetchedResult = null;
      renderHome();
    }

    async function autoImportResult(raceId) {
      const race = CALENDAR_2026.find(r => r.id === raceId);
      showToast(`🤖 Import ${race?.name}...`, 'ok');
      document.getElementById('moverlay').classList.add('hidden');

      const result = await fetchOpenF1RaceResult(raceId);
      if (!result) {
        showToast('❌ OpenF1: risultati non disponibili ancora', 'err');
        return;
      }

      await saveAndComputeResult(result);
    }

    function sanitizeResult(result) {
      // Rimuovi colonne non ancora nel DB per evitare schema cache errors
      const r = { ...result };
      return r;
    }

    async function saveAndComputeResult(result) {
      const { error } = await sb.from('race_results').upsert(sanitizeResult(result), { onConflict: 'race_id' });
      if (error) { showToast('❌ ' + error.message, 'err'); return; }
      await computeAndSavePts(result.race_id, result);
      await autoUpdateMarketPrices(result);
      await sb.from('admin_log').insert({
        action: `Auto-import ${result.race_id} (${result.source})`,
        by_user: currentProfile?.nickname || 'admin'
      });
      showToast('✅ Import completato! Punti e mercato aggiornati.', 'ok');
      renderHome();
    }



    // ══════════════════ ECONOMIA WEEKEND ══════════════════
    // Guadagni crediti piloti in base alla posizione in gara (nuovi valori 2026)
    const DRIVER_EARNINGS = { 1: 32, 2: 30, 3: 28, 4: 26, 5: 25, 6: 24, 7: 23, 8: 22, 9: 21, 10: 20, 11: 19, 12: 18, 13: 17, 14: 16, 15: 15 };
    // Variazione valore pilota in base alla posizione (fine weekend)
    const DRIVER_VALUE_CHANGE = { 1: +5, 2: +4, 3: +3, 4: +2, 5: +2, 6: +1, 7: 0, 8: 0, 9: -1, 10: -1 };

    // Guadagni scuderia: somma guadagni i due piloti; se entrambi DNF → 0
    function calcTeamEarnings(teamName, result) {
      const drivers = DRIVERS_2026.filter(d => d.team === teamName).map(d => d.name);
      const dnfs = (result.dnf_drivers || '').split(',').map(s => s.trim()).filter(Boolean);
      const bothDNF = drivers.length >= 2 && drivers.every(d => dnfs.includes(d));
      if (bothDNF) return 0;
      const top10 = [result.p1, result.p2, result.p3, result.p4, result.p5, result.p6, result.p7, result.p8, result.p9, result.p10];
      let total = 0;
      drivers.forEach(d => {
        const pos = top10.indexOf(d) + 1;
        if (pos > 0) total += DRIVER_EARNINGS[pos] || 3;
      });
      return total;
    }

    function getDriverPosition(driverName, result) {
      const top10 = [result.p1, result.p2, result.p3, result.p4, result.p5, result.p6, result.p7, result.p8, result.p9, result.p10];
      const pos = top10.indexOf(driverName) + 1;
      return pos;
    }

    async function openEconomyPanel(c) {
      c.innerHTML = '<span class="mclose" onclick="closeMod()">✕</span><div style="padding:20px;text-align:center;color:var(--t3)">⟳ Caricamento...</div>';

      // Select minimo per evitare schema cache errors (niente colonne problemative)
      const { data: rawResults, error: resErr } = await sb.from('race_results').select('race_id,p1,source').order('race_id', { ascending: true });

      if (resErr) {
        c.innerHTML = '<span class="mclose" onclick="closeMod()">✕</span>' +
          '<div class="mtitle">💰 Economia Weekend</div>' +
          '<div class="status-banner sb-err">❌ Errore DB: ' + resErr.message + '<br>Prova: Supabase → SQL Editor → <code>NOTIFY pgrst, \'reload schema\';</code></div>';
        return;
      }

      // Ordina secondo il calendario 2026
      const results = (rawResults || [])
        .map(r => { const cal = CALENDAR_2026.find(x => x.id === r.race_id); return cal ? { ...r, round: cal.round, cal } : null; })
        .filter(Boolean)
        .sort((a, b) => a.round - b.round);

      let html = '<span class="mclose" onclick="closeMod()">✕</span>';
      html += '<div class="mtitle">💰 Economia Weekend</div>';
      html += '<div class="status-banner sb-info">Seleziona il GP per vedere stipendi e guadagni. L\'economia viene applicata automaticamente al calcolo GP — qui puoi visualizzarla o riapplicarla manualmente.</div>';
      html += '<div class="fg"><label>🏁 GP di Riferimento</label><select class="fi fi-sel" id="eco-race">';
      if (!results.length) {
        html += '<option value="">— Nessun GP con risultati salvati —</option>';
      } else {
        results.forEach(r => {
          html += `<option value="${r.race_id}">${r.cal.flag} R${r.cal.round} · ${r.cal.name}</option>`;
        });
      }
      html += '</select></div>';
      html += `<div style="font-size:10px;color:var(--t3);margin-bottom:8px">${results.length} GP trovati con risultati</div>`;
      html += '<button class="btn btn-ok btn-w" onclick="calcEconomy()">📊 Calcola Economia</button>';
      html += '<div id="eco-preview" style="margin-top:12px"></div>';
      c.innerHTML = html;
    }
    async function calcEconomy() {
      const raceId = document.getElementById('eco-race')?.value;
      if (!raceId) { showToast('Seleziona un GP', 'err'); return; }
      const { data: result } = await sb.from('race_results').select('*').eq('race_id', raceId).maybeSingle();
      if (!result) { showToast('Nessun risultato per questo GP', 'err'); return; }
      const { data: users } = await sb.from('profiles').select('*').order('nickname');
      const { data: lots } = await sb.from('auction_lots').select('*');
      const nextRace = getNextRace();
      const { data: allTeams } = nextRace ? await sb.from('fantasy_teams').select('*').eq('race_id', nextRace.id) : { data: [] };

      const el = document.getElementById('eco-preview');
      if (!el) return;

      let html = '<div style="font-family:\'Exo 2\',sans-serif;font-weight:900;font-size:12px;letter-spacing:2px;color:var(--t3);text-transform:uppercase;margin-bottom:10px">📊 Riepilogo Economia</div>';

      const userChanges = [];

      (users || []).forEach(u => {
        const won = (lots || []).filter(l => l.winner_id === u.id && l.status === 'sold');
        const spent = won.reduce((s, l) => s + (l.final_price || 0), 0);
        const myDrivers = won.filter(l => l.item_type === 'driver').map(l => l.item_name);
        const myTeam = won.find(l => l.item_type === 'team')?.item_name || null;
        const budget = AUCTION_BUDGET - spent;

        let stipendi = 0, guadagni = 0;

        // Stipendi piloti
        myDrivers.forEach(dName => {
          const drv = DRIVERS_2026.find(d => d.name === dName);
          if (drv) stipendi += drv.salary || 0;
        });
        // Stipendio scuderia
        if (myTeam) stipendi += (TEAM_SALARIES_2026[myTeam] || 0);

        // Guadagni piloti
        myDrivers.forEach(dName => {
          const pos = getDriverPosition(dName, result);
          if (pos > 0) guadagni += (DRIVER_EARNINGS[pos] || 3);
          else {
            const dnfs = (result.dnf_drivers || '').split(',').map(s => s.trim());
            if (!dnfs.includes(dName)) guadagni += 2; // pilota che finisce fuori top10 ma non ritirato
          }
        });
        // Guadagni scuderia
        if (myTeam) guadagni += calcTeamEarnings(myTeam, result);

        const delta = guadagni - stipendi;
        const newBudget = budget + delta;

        userChanges.push({ u, budget, stipendi, guadagni, delta, newBudget, drivers: myDrivers, team: myTeam });

        html += `<div style="background:var(--s2);border-radius:10px;padding:11px;margin-bottom:8px;border-left:3px solid ${delta >= 0 ? 'var(--green)' : 'var(--red)'}">`;
        html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">`;
        html += `<div class="av" style="background:${u.color};width:28px;height:28px;font-size:12px;flex-shrink:0">${u.avatar}</div>`;
        html += `<div style="flex:1;font-weight:700;font-size:14px">${u.nickname}</div>`;
        html += `<div style="text-align:right"><div style="font-size:11px;color:var(--t3)">Budget ora</div><div style="font-family:'Exo 2',sans-serif;font-weight:900;font-size:18px;color:var(--gold)">${budget}cr</div></div>`;
        html += `</div>`;
        html += `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;font-size:11px">`;
        html += `<div style="background:var(--s1);border-radius:6px;padding:6px;text-align:center"><div style="color:var(--t3)">Stipendi</div><div style="color:#ff7070;font-weight:800">-${stipendi}cr</div></div>`;
        html += `<div style="background:var(--s1);border-radius:6px;padding:6px;text-align:center"><div style="color:var(--t3)">Guadagni</div><div style="color:var(--green);font-weight:800">+${guadagni}cr</div></div>`;
        html += `<div style="background:var(--s1);border-radius:6px;padding:6px;text-align:center"><div style="color:var(--t3)">Netto</div><div style="color:${delta >= 0 ? 'var(--green)' : '#ff7070'};font-weight:800">${delta >= 0 ? '+' : ''}${delta}cr</div></div>`;
        html += `</div>`;
        html += `<div style="margin-top:6px;font-size:10px;color:var(--t3)">Piloti: ${myDrivers.length ? myDrivers.map(d => d.split(' ').pop()).join(', ') : '—'} · Scuderia: ${myTeam || '—'}</div>`;
        html += `<div style="margin-top:4px;font-size:12px;color:var(--t1);font-weight:700">Nuovo budget: <span style="color:var(--gold)">${newBudget}cr</span></div>`;
        html += `</div>`;
      });

      // Serializziamo i cambiamenti per poterli applicare
      window._econChanges = userChanges;
      window._econRaceId = raceId;

      html += `<button class="btn btn-r btn-w" style="margin-top:12px" onclick="applyEconomy()">✅ Applica Economia a Tutti</button>`;
      el.innerHTML = html;
    }

    async function applyEconomy() {
      const changes = window._econChanges;
      const raceId = window._econRaceId;
      if (!changes || !raceId) { showToast('Calcola prima la preview', 'err'); return; }
      if (!confirm('Applicare stipendi e guadagni a tutti gli utenti?')) return;

      const { data: lots } = await sb.from('auction_lots').select('*');

      for (const { u, delta, drivers, team } of changes) {
        // Aggiorna i crediti restituendo/addebitando dal "budget residuo" fittizio via nuovo lotto o update diretto
        // Utilizziamo un lotto speciale tipo 'economy' per tracciare i movimenti
        await sb.from('admin_log').insert({
          action: `Economia GP ${raceId}: ${u.nickname} netto ${delta >= 0 ? '+' : ''}${delta}cr (stip+guad)`,
          by_user: currentProfile?.nickname || 'admin'
        });
      }

      // Aggiorna i valori dei piloti
      const { data: resultData } = await sb.from('race_results').select('*').eq('race_id', raceId).maybeSingle();
      if (resultData) {
        for (const drv of DRIVERS_2026) {
          const pos = getDriverPosition(drv.name, resultData);
          let change = 0;
          if (pos > 0) change = DRIVER_VALUE_CHANGE[pos] || 0;
          else {
            const dnfs = (resultData.dnf_drivers || '').split(',').map(s => s.trim());
            if (dnfs.includes(drv.name)) change = -3;
            else change = -1;
          }
          const newPrice = Math.max(5, drv.price + change);
          await sb.from('driver_prices').upsert({ driver_name: drv.name, price: newPrice, updated_at: new Date().toISOString() }, { onConflict: 'driver_name' });
          drv.price = newPrice;
        }
      }

      showToast('✅ Economia applicata! Valori piloti aggiornati.', 'ok');
      closeMod();
    }


    async function autoUpdateMarketPrices(result) {
      // Calcola e salva le variazioni di valore per ogni pilota e scuderia
      // basandosi sulla posizione finale di gara e sulla fascia di appartenenza

      const dnfList = (result.dnf_drivers || '').split(',').map(x => x.trim()).filter(Boolean);
      const top10 = [result.p1, result.p2, result.p3, result.p4, result.p5,
      result.p6, result.p7, result.p8, result.p9, result.p10].filter(Boolean);
      const fullOrder = [result.p1, result.p2, result.p3, result.p4, result.p5,
      result.p6, result.p7, result.p8, result.p9, result.p10,
      ...(Array(12).fill(null))]; // pos 11-22 non in top10

      const updates = [];
      const log = [];

      for (const d of DRIVERS_2026) {
        let tier = 'mid';
        if (DRIVER_TIERS.top.includes(d.name)) tier = 'top';
        else if (DRIVER_TIERS.low.includes(d.name)) tier = 'low';

        const isDNF = dnfList.includes(d.name);
        let delta = 0;

        if (isDNF) {
          delta = DNF_DELTA_DRIVER; // -2 fisso per DNF
        } else {
          // Trova posizione (1-based)
          const pos = top10.indexOf(d.name);
          if (pos !== -1) {
            // Pilota in top 10: usa la sua posizione (0-indexed → pos 0=P1)
            delta = TIER_DELTA[tier][pos] ?? 0;
          } else {
            // Fuori dalla top 10 — usa una posizione stimata (P11-P22)
            // Dato che non abbiamo la classifica completa, usiamo P15 come stima
            delta = TIER_DELTA[tier][14] ?? 0;
          }
        }

        const newPrice = Math.max(5, Math.min(120, d.price + delta));
        if (newPrice !== d.price) {
          updates.push({ driver_name: d.name, price: newPrice, updated_at: new Date().toISOString() });
          log.push(d.name + ': ' + d.price + ' → ' + newPrice + ' (' + (delta >= 0 ? '+' : '') + delta + ')');
          d.price = newPrice; // aggiorna in memoria
        }
      }

      // Aggiorna scuderie — usa somma punti F1 reali dei 2 piloti per classifica costruttori weekend
      const F1_RACE_PTS = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 };
      const raceOrder = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];

      // Calcola punti F1 di ogni team nel weekend
      const teamWeekendPts = {};
      TEAMS_2026.forEach(t => { teamWeekendPts[t] = 0; });
      raceOrder.forEach((key, idx) => {
        const driverName = result[key];
        if (!driverName) return;
        const drv = DRIVERS_2026.find(d => d.name === driverName);
        if (!drv) return;
        const pts = F1_RACE_PTS[idx + 1] || 0;
        teamWeekendPts[drv.team] = (teamWeekendPts[drv.team] || 0) + pts;
      });

      // Classifica costruttori del weekend (ordinata per punti F1)
      const teamRanking = TEAMS_2026
        .map(t => ({ team: t, pts: teamWeekendPts[t] || 0 }))
        .sort((a, b) => b.pts - a.pts);

      const teamPriceUpdates = [];
      teamRanking.forEach(({ team, pts }, rankIdx) => {
        let tier = 'low';
        if (TEAM_TIERS.top.includes(team)) tier = 'top';
        else if (TEAM_TIERS.mid.includes(team)) tier = 'mid';

        const posIdx = Math.min(rankIdx, 10); // 0-indexed rank (0=1° posto)
        const delta = TEAM_TIER_DELTA[tier][posIdx] ?? 0;

        const currentPrice = TEAM_PRICES_2026[team] || 20;
        const newPrice = Math.max(5, Math.min(150, currentPrice + delta));
        TEAM_PRICES_2026[team] = newPrice;
        teamPriceUpdates.push({ driver_name: 'TEAM:' + team, price: newPrice, updated_at: new Date().toISOString() });
        log.push(team + ' [' + pts + 'pts F1, rank ' + (rankIdx + 1) + ']: ' + currentPrice + ' → ' + newPrice + ' (' + (delta >= 0 ? '+' : '') + delta + ')');
      });

      // Salva su Supabase
      const allUpdates = [...updates, ...teamPriceUpdates];
      for (const u of allUpdates) {
        await sb.from('driver_prices').upsert(u, { onConflict: 'driver_name' });
      }

      return log;
    }


    // ══════════════════ MERCATO BUSTE ══════════════════
    // Ogni giorno 08:00–18:00 (ora italiana) l'admin può aprire "buste" per piloti/scuderie svincolate.
    // Ogni utente fa UN'offerta per busta, usando come valuta principale il VALORE CORRENTE del suo
    // pilota/scuderia svincolato (PROMESSA DI SVINCOLO) + eventuali crediti aggiuntivi.
    // Al termine, chi ha offerto di più vince. Se perde, mantiene il suo pilota/scuderia.
    // ─────────────────────────────────────────────────────────────────────────────────

    async function renderEnvelopeMarket() {
      const el = document.getElementById('fantasy-buste');
      if (!el) return;
      el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--t3)">⟳ Caricamento...</div>';

      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);

      // Carica buste aperte (oggi) e tutte quelle recenti
      const { data: envelopes } = await sb.from('envelope_market')
        .select('*')
        .order('open_from', { ascending: false })
        .limit(20);

      const { data: myOffers } = await sb.from('envelope_offers')
        .select('*')
        .eq('user_id', currentUser.id);

      // Mio team attuale
      const nextRace = getNextRace();
      const { data: myTeam } = nextRace ? await sb.from('fantasy_teams')
        .select('*').eq('user_id', currentUser.id).eq('race_id', nextRace.id).maybeSingle() : { data: null };

      const myItems = [];
      if (myTeam?.driver1) myItems.push({ name: myTeam.driver1, type: 'driver', price: DRIVERS_2026.find(d => d.name === myTeam.driver1)?.price || 0 });
      if (myTeam?.driver2) myItems.push({ name: myTeam.driver2, type: 'driver', price: DRIVERS_2026.find(d => d.name === myTeam.driver2)?.price || 0 });
      if (myTeam?.team1) myItems.push({ name: myTeam.team1, type: 'team', price: TEAM_PRICES_2026[myTeam.team1] || 0 });

      // Carica tutte le offerte per visualizzare le buste
      const { data: allOffers } = await sb.from('envelope_offers').select('*');
      const offersByEnv = {};
      (allOffers || []).forEach(o => {
        if (!offersByEnv[o.envelope_id]) offersByEnv[o.envelope_id] = [];
        offersByEnv[o.envelope_id].push(o);
      });

      // Buste aperte ora (finestra attiva)
      const openEnvelopes = (envelopes || []).filter(e => {
        return e.status === 'open' && new Date(e.open_from) <= now && new Date(e.open_until) >= now;
      });
      // Buste chiuse recenti (ultime 7)
      const closedEnvelopes = (envelopes || []).filter(e => e.status !== 'open' || new Date(e.open_until) < now).slice(0, 7);

      let html = '';

      // ── INFO BUSTE ──
      html += `<div class="card" style="border-color:rgba(255,165,0,.3);background:rgba(255,165,0,.04)">
        <div class="ctitle" style="color:#ffaa44;margin-bottom:8px">📬 Mercato Buste</div>
        <div style="font-size:11px;color:var(--t2);line-height:1.6">
          Ogni giorno <strong style="color:var(--t1)">08:00–18:00</strong> l'admin apre buste per piloti e scuderie svincolate.<br>
          Per fare un'offerta devi indicare un tuo <strong style="color:var(--yellow)">pilota o scuderia come promessa di svincolo</strong>: il suo valore di mercato attuale è la tua offerta base.
          Puoi aggiungere crediti extra. <strong style="color:var(--green)">Se vinci</strong>, il tuo pilota/scuderia viene svincolato e ottieni quello nella busta. <strong style="color:var(--red)">Se perdi</strong>, mantieni il tuo pilota/scuderia intatto.
        </div>
      </div>`;

      // ── BUSTE APERTE ──
      if (openEnvelopes.length === 0) {
        const h = now.getHours();
        const msg = h < 8 ? '⏳ Le buste apriranno alle 08:00' : h >= 18 ? '🔒 Buste chiuse per oggi (riaprono domani alle 08:00)' : '📭 Nessuna busta aperta in questo momento';
        html += `<div style="text-align:center;padding:20px;color:var(--t3);font-size:12px">${msg}</div>`;
      } else {
        html += `<div class="stitle">📬 Buste Aperte Ora</div>`;
        openEnvelopes.forEach(env => {
          const myOffer = (myOffers || []).find(o => o.envelope_id === env.id);
          const envOffers = offersByEnv[env.id] || [];
          const topOffer = envOffers.length > 0 ? Math.max(...envOffers.map(o => o.total_value || 0)) : 0;
          const timeLeft = Math.max(0, Math.floor((new Date(env.open_until) - now) / 60000));
          const h = Math.floor(timeLeft / 60), m = timeLeft % 60;
          const timeStr = timeLeft > 60 ? `${h}h ${m}m` : `${m} min`;

          html += `<div class="card" style="border-color:rgba(255,165,0,.4)">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
              <div style="font-size:28px">${env.item_type === 'driver' ? (DRIVERS_2026.find(d => d.name === env.item_name)?.abbr || '👤') : '🏎️'}</div>
              <div style="flex:1">
                <div style="font-weight:900;font-size:15px">${env.item_name}</div>
                <div style="font-size:10px;color:var(--t3)">${env.item_type === 'driver' ? 'Pilota' : 'Scuderia'} · Valore: <span style="color:var(--yellow)">${env.item_type === 'driver' ? (DRIVERS_2026.find(d => d.name === env.item_name)?.price || '?') : (TEAM_PRICES_2026[env.item_name] || '?')}cr</span></div>
              </div>
              <div style="text-align:right">
                <div style="font-size:9px;color:var(--t3)">Chiude tra</div>
                <div style="font-family:'Exo 2',sans-serif;font-weight:900;font-size:16px;color:#ffaa44">${timeStr}</div>
                <div style="font-size:9px;color:var(--t3)">${envOffers.length} offert${envOffers.length === 1 ? 'a' : 'e'}</div>
              </div>
            </div>`;

          if (myOffer) {
            html += `<div class="status-banner sb-ok" style="font-size:11px">
              ✅ Tua offerta: <strong>${myOffer.pledge_item}</strong> (${myOffer.pledge_value}cr) ${myOffer.extra_credits > 0 ? `+ ${myOffer.extra_credits}cr extra` : ''} = <strong>${myOffer.total_value}cr totali</strong>
              <button class="btn btn-sm btn-no" style="margin-left:8px;padding:3px 8px" onclick="cancelEnvelopeOffer('${myOffer.id}','${env.id}')">Annulla</button>
            </div>`;
          } else if (myItems.length > 0) {
            html += `<div id="env-form-${env.id}">
              <div style="font-size:11px;color:var(--t2);margin-bottom:8px">Scegli cosa metti in gioco come promessa di svincolo:</div>
              <select class="fi fi-sel" id="env-pledge-${env.id}" onchange="updateEnvTotal('${env.id}')">
                <option value="">— Seleziona pilota/scuderia —</option>
                ${myItems.map(i => `<option value="${i.name}|${i.type}|${i.price}">${i.name} (${i.type === 'driver' ? 'Pilota' : 'Scuderia'}) — valore ${i.price}cr</option>`).join('')}
              </select>
              <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
                <div style="flex:1">
                  <label style="font-size:9px;color:var(--t3);letter-spacing:2px;display:block;margin-bottom:4px">CREDITI EXTRA (opzionali)</label>
                  <input type="number" class="fi" id="env-extra-${env.id}" min="0" value="0" placeholder="0" oninput="updateEnvTotal('${env.id}')">
                </div>
                <div style="text-align:center;min-width:80px">
                  <div style="font-size:9px;color:var(--t3)">OFFERTA TOTALE</div>
                  <div id="env-total-${env.id}" style="font-family:'Exo 2',sans-serif;font-weight:900;font-size:22px;color:var(--yellow)">0cr</div>
                </div>
              </div>
              <button class="btn btn-r btn-w" style="margin-top:10px" onclick="submitEnvelopeOffer('${env.id}','${nextRace?.id || ''}')">📩 Invia Offerta</button>
            </div>`;
          } else {
            html += `<div style="color:var(--t3);font-size:11px;text-align:center;padding:8px">⚠️ Non hai piloti/scuderie da offrire come promessa di svincolo</div>`;
          }
          html += `</div>`;
        });
      }

      // ── BUSTE CHIUSE RECENTI ──
      if (closedEnvelopes.length > 0) {
        html += `<div class="stitle" style="margin-top:18px">📜 Buste Recenti</div>`;
        for (const env of closedEnvelopes) {
          const envOffers = offersByEnv[env.id] || [];
          const winnerOffer = envOffers.find(o => o.user_id === env.winner_id);
          const myOffer = (myOffers || []).find(o => o.envelope_id === env.id);
          const iWon = env.winner_id === currentUser.id;
          const openTime = new Date(env.open_from).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
          html += `<div style="background:var(--s2);border:1px solid ${iWon ? 'rgba(0,232,135,.3)' : 'var(--border)'};border-radius:12px;padding:11px;margin-bottom:7px">
            <div style="display:flex;align-items:center;gap:8px">
              <div style="font-weight:700;font-size:13px">${env.item_name}</div>
              <div style="font-size:9px;color:var(--t3)">${env.item_type === 'driver' ? 'Pilota' : 'Scuderia'} · ${openTime}</div>
              <div style="margin-left:auto;font-size:10px;padding:2px 7px;border-radius:4px;background:${env.status === 'awarded' ? 'rgba(0,232,135,.1)' : 'rgba(100,100,120,.2)'};color:${env.status === 'awarded' ? 'var(--green)' : 'var(--t3)'}">
                ${env.status === 'awarded' ? '✅ Aggiudicata' : '⏳ In attesa'}
              </div>
            </div>
            ${env.winner_id ? `<div style="font-size:11px;color:var(--green);margin-top:4px">🏆 Vinta da: <strong>${winnerOffer?.pledge_item || '?'} → ${env.item_name}</strong> (${winnerOffer?.total_value || '?'}cr)</div>` : ''}
            ${myOffer ? `<div style="font-size:11px;color:${iWon ? 'var(--green)' : 'var(--t3)'};margin-top:3px">
              ${iWon ? '✅ Hai vinto!' : '❌ Non aggiudicata'} · Tua offerta: ${myOffer.pledge_item} (${myOffer.total_value}cr)
            </div>` : ''}
            <div style="font-size:10px;color:var(--t3);margin-top:3px">${envOffers.length} offert${envOffers.length === 1 ? 'a' : 'e'} totali</div>
          </div>`;
        }
      }

      // ── PANNELLO ADMIN ──
      if (currentProfile?.role === 'admin') {
        html += `<div class="stitle" style="margin-top:18px;color:var(--red)">⚙️ Admin — Gestione Buste</div>
          <div style="background:var(--s2);border:1px solid var(--border2);border-radius:12px;padding:14px">
            <div style="font-size:11px;color:var(--t2);margin-bottom:12px">Apri una nuova busta per un pilota o scuderia svincolata. La busta sarà attiva per oggi 08:00–18:00.</div>
            <div class="fg">
              <label>Tipo</label>
              <select class="fi fi-sel" id="env-admin-type" onchange="updateEnvAdminList()">
                <option value="driver">👤 Pilota</option>
                <option value="team">🏎️ Scuderia</option>
              </select>
            </div>
            <div class="fg">
              <label>Pilota / Scuderia</label>
              <select class="fi fi-sel" id="env-admin-item">
                ${DRIVERS_2026.map(d => `<option value="${d.name}">${d.name} (${d.price}cr)</option>`).join('')}
              </select>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <div class="fg">
                <label>Ore inizio</label>
                <input type="time" class="fi" id="env-admin-from" value="08:00">
              </div>
              <div class="fg">
                <label>Ore fine</label>
                <input type="time" class="fi" id="env-admin-until" value="18:00">
              </div>
            </div>
            <button class="btn btn-r btn-w" onclick="createEnvelope()">📬 Apri Busta</button>
          </div>`;

        // Offerte pendenti su buste aperte
        if (openEnvelopes.length > 0) {
          html += `<div style="margin-top:12px">`;
          for (const env of openEnvelopes) {
            const envOffers = offersByEnv[env.id] || [];
            const sorted = envOffers.sort((a, b) => (b.total_value || 0) - (a.total_value || 0));
            html += `<div style="background:var(--s2);border:1px solid rgba(255,165,0,.3);border-radius:10px;padding:10px;margin-bottom:8px">
              <div style="font-weight:700;font-size:13px;margin-bottom:8px">📬 ${env.item_name} — ${sorted.length} offert${sorted.length === 1 ? 'a' : 'e'}</div>
              ${sorted.length === 0 ? '<div style="color:var(--t3);font-size:11px">Nessuna offerta ancora</div>' : sorted.map((o, i) => `
                <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)">
                  <div style="font-size:11px;color:${i === 0 ? 'var(--yellow)' : 'var(--t2)'};font-weight:${i === 0 ? '900' : '400'};width:16px">${i === 0 ? '🥇' : i + 1}</div>
                  <div style="flex:1;font-size:11px">${o.pledge_item} <span style="color:var(--t3)">(${o.pledge_value}cr)</span>${o.extra_credits > 0 ? ` + ${o.extra_credits}cr` : ''}</div>
                  <div style="font-family:'Exo 2',sans-serif;font-weight:900;font-size:14px;color:var(--yellow)">${o.total_value}cr</div>
                </div>`).join('')}
              ${sorted.length > 0 ? `<button class="btn btn-ok btn-sm btn-w" style="margin-top:8px" onclick="awardEnvelope('${env.id}')">✅ Aggiudica al miglior offerente</button>` : ''}
            </div>`;
          }
          html += `</div>`;
        }
      }

      el.innerHTML = html;
    }

    function updateEnvTotal(envId) {
      const pledgeSel = document.getElementById('env-pledge-' + envId);
      const extraEl = document.getElementById('env-extra-' + envId);
      const totalEl = document.getElementById('env-total-' + envId);
      if (!pledgeSel || !totalEl) return;
      const parts = pledgeSel.value.split('|');
      const pledgeVal = parts[2] ? parseInt(parts[2]) : 0;
      const extra = parseInt(extraEl?.value) || 0;
      totalEl.textContent = (pledgeVal + extra) + 'cr';
    }

    function updateEnvAdminList() {
      const type = document.getElementById('env-admin-type')?.value;
      const sel = document.getElementById('env-admin-item');
      if (!sel) return;
      if (type === 'driver') {
        sel.innerHTML = DRIVERS_2026.map(d => `<option value="${d.name}">${d.name} (${d.price}cr)</option>`).join('');
      } else {
        sel.innerHTML = TEAMS_2026.map(t => `<option value="${t}">${t} (${TEAM_PRICES_2026[t] || 0}cr)</option>`).join('');
      }
    }

    async function createEnvelope() {
      const type = document.getElementById('env-admin-type')?.value;
      const item = document.getElementById('env-admin-item')?.value;
      const fromTime = document.getElementById('env-admin-from')?.value || '08:00';
      const untilTime = document.getElementById('env-admin-until')?.value || '18:00';
      if (!item) { showToast('Seleziona un elemento', 'err'); return; }

      const today = new Date().toISOString().slice(0, 10);
      const tz = 'Europe/Rome';
      // Costruisci datetime in ora italiana (UTC+1/2)
      const offset = new Date().getTimezoneOffset(); // minuti, negativo per UTC+
      const fromISO = new Date(`${today}T${fromTime}:00`).toISOString();
      const untilISO = new Date(`${today}T${untilTime}:00`).toISOString();

      const { error } = await sb.from('envelope_market').insert({
        item_type: type,
        item_name: item,
        open_from: fromISO,
        open_until: untilISO,
        status: 'open'
      });
      if (error) { showToast('❌ ' + error.message, 'err'); return; }
      await sb.from('admin_log').insert({ action: `Busta aperta: ${item} (${type}) ${fromTime}–${untilTime}`, by_user: currentProfile?.nickname || 'admin' });
      showToast('✅ Busta aperta!', 'ok');
      renderEnvelopeMarket();
    }

    async function submitEnvelopeOffer(envId, raceId) {
      const pledgeRaw = document.getElementById('env-pledge-' + envId)?.value;
      const extra = parseInt(document.getElementById('env-extra-' + envId)?.value) || 0;
      if (!pledgeRaw) { showToast('Seleziona cosa metti in gioco', 'err'); return; }

      const [pledgeItem, pledgeType, pledgeValStr] = pledgeRaw.split('|');
      const pledgeValue = parseInt(pledgeValStr) || 0;
      const totalValue = pledgeValue + extra;

      // Verifica crediti sufficienti per i crediti extra
      const myCredits = await getUserCredits(currentUser.id);
      if (extra > myCredits) { showToast(`Crediti insufficienti (hai ${myCredits}cr)`, 'err'); return; }

      const { error } = await sb.from('envelope_offers').upsert({
        envelope_id: envId,
        user_id: currentUser.id,
        pledge_item: pledgeItem,
        pledge_item_type: pledgeType,
        pledge_value: pledgeValue,
        extra_credits: extra,
        total_value: totalValue,
        status: 'pending'
      }, { onConflict: 'envelope_id,user_id' });

      if (error) { showToast('❌ ' + error.message, 'err'); return; }
      await sb.from('admin_log').insert({ action: `Offerta busta: ${currentProfile?.nickname} → ${pledgeItem} per ${totalValue}cr`, by_user: currentProfile?.nickname || '?' });
      showToast('✅ Offerta inviata!', 'ok');
      renderEnvelopeMarket();
    }

    async function cancelEnvelopeOffer(offerId, envId) {
      if (!confirm("Annullare l'offerta?")) return;
      await sb.from('envelope_offers').delete().eq('id', offerId);
      showToast('Offerta annullata', 'ok');
      renderEnvelopeMarket();
    }

    async function awardEnvelope(envId) {
      // Trova l'offerta vincente (massimo total_value)
      const { data: offers } = await sb.from('envelope_offers').select('*').eq('envelope_id', envId).order('total_value', { ascending: false });
      const { data: env } = await sb.from('envelope_market').select('*').eq('id', envId).single();
      if (!offers || offers.length === 0) { showToast('Nessuna offerta', 'err'); return; }
      if (!env) { showToast('Busta non trovata', 'err'); return; }

      const winner = offers[0]; // miglior offerta
      const losers = offers.slice(1);

      // Aggiorna status busta
      await sb.from('envelope_market').update({ status: 'awarded', winner_id: winner.user_id, awarded_at: new Date().toISOString() }).eq('id', envId);

      // Aggiorna status offerte
      await sb.from('envelope_offers').update({ status: 'won' }).eq('id', winner.id);
      for (const l of losers) {
        await sb.from('envelope_offers').update({ status: 'lost' }).eq('id', l.id);
      }

      // ─── Esegui lo scambio per il vincitore ───
      const nextRace = getNextRace();
      if (nextRace) {
        const { data: winTeam } = await sb.from('fantasy_teams').select('*').eq('user_id', winner.user_id).eq('race_id', nextRace.id).maybeSingle();
        if (winTeam) {
          const updTeam = { ...winTeam };
          // Rimuovi il pledge_item
          if (updTeam.driver1 === winner.pledge_item) updTeam.driver1 = null;
          else if (updTeam.driver2 === winner.pledge_item) updTeam.driver2 = null;
          else if (updTeam.team1 === winner.pledge_item) updTeam.team1 = null;

          // Aggiungi il nuovo elemento
          if (env.item_type === 'driver') {
            if (!updTeam.driver1) updTeam.driver1 = env.item_name;
            else if (!updTeam.driver2) updTeam.driver2 = env.item_name;
            else updTeam.driver1 = env.item_name;
          } else {
            updTeam.team1 = env.item_name;
          }
          updTeam.saved_at = new Date().toISOString();
          await sb.from('fantasy_teams').upsert(updTeam, { onConflict: 'user_id,race_id' });
        }

        // Traccia il pledge come lotto svincolato nell'asta (con finale_price = pledge_value)
        const winUser = await sb.from('profiles').select('nickname').eq('id', winner.user_id).single();
        // Sposta pledge_item come elemento disponibile nell'asta (libero)
        await sb.from('auction_lots').insert({
          item_name: winner.pledge_item,
          item_type: winner.pledge_item_type,
          base_price: winner.pledge_value,
          current_bid: winner.pledge_value,
          status: 'active', // torna disponibile
          notes: `Svincolato tramite busta da ${winUser?.data?.nickname || '?'}`
        }).catch(() => { }); // non bloccare se fallisce
      }

      // Se ci sono crediti extra, li scala dal vincitore
      if (winner.extra_credits > 0) {
        await sb.from('auction_lots').insert({
          item_name: `BUST:${envId}:extra`,
          item_type: 'economy_delta',
          status: 'sold',
          base_price: 0,
          current_bid: winner.extra_credits,
          final_price: winner.extra_credits,
          winner_id: winner.user_id,
          notes: `Crediti extra busta ${env.item_name}: ${winner.extra_credits}cr`
        });
      }

      await sb.from('admin_log').insert({
        action: `Busta aggiudicata: ${env.item_name} → ${offers[0]?.pledge_item} (${offers[0]?.total_value}cr)`,
        by_user: currentProfile?.nickname || 'admin'
      });
      showToast(`✅ Aggiudicato! ${env.item_name} → vincitore`, 'ok');
      renderEnvelopeMarket();
      renderHome();
    }

    // ══════════════════ FINE MERCATO BUSTE ══════════════════

    // ══════════════════ STIPENDI AUTO (all'inizio qualifiche) ══════════════════
    // Chiamata automaticamente quando il countdown qualifiche arriva a 0.
    // Scala gli stipendi a tutti. Se un utente va in negativo → insolvente per questo GP:
    // non guadagna punti, crediti, né li perde. I pronostici non valgono.
    async function autoDeductSalaries(raceId) {
      // Controlla se già eseguito per questo GP
      const { data: prevLog } = await sb.from('admin_log').select('id')
        .ilike('action', 'Stipendi GP ' + raceId + ':%').limit(1);
      if (prevLog && prevLog.length > 0) return; // già fatto

      const { data: users } = await sb.from('profiles').select('id,nickname');
      // Carica i team che gareggeranno (il team più recente di ciascun utente)
      const { data: raceTeams } = await sb.from('fantasy_teams').select('*').eq('race_id', raceId);
      // Fallback: ultimo team salvato se non esiste per questo GP
      const { data: allTeams } = await sb.from('fantasy_teams').select('*').order('saved_at', { ascending: false });
      const teamMap = {};
      (allTeams || []).forEach(t => { if (!teamMap[t.user_id]) teamMap[t.user_id] = t; });
      (raceTeams || []).forEach(t => { teamMap[t.user_id] = t; });

      for (const u of (users || [])) {
        const myTeam = teamMap[u.id];
        const myDrivers = [myTeam?.driver1, myTeam?.driver2].filter(Boolean);
        const myTeamName = myTeam?.team1 || null;

        let stipendi = myDrivers.reduce((s, n) => {
          const d = DRIVERS_2026.find(x => x.name === n); return s + (d?.salary || 0);
        }, 0);
        if (myTeamName) stipendi += (TEAM_SALARIES_2026[myTeamName] || 0);

        if (stipendi === 0) continue; // nessun team, nessun stipendio

        // Calcola crediti attuali
        const { data: uLots } = await sb.from('auction_lots').select('final_price,item_type')
          .eq('winner_id', u.id).eq('status', 'sold');
        const { data: uPups } = await sb.from('powerup_purchases').select('cost').eq('user_id', u.id);
        const spentA = (uLots || []).filter(l => l.item_type !== 'economy_delta').reduce((s, l) => s + (l.final_price || 0), 0);
        const spentE = (uLots || []).filter(l => l.item_type === 'economy_delta').reduce((s, l) => s + (l.final_price || 0), 0);
        const spentP = (uPups || []).reduce((s, p) => s + (p.cost || 0), 0);
        const currentCredits = AUCTION_BUDGET - spentA - spentP - spentE;
        const newCredits = currentCredits - stipendi;

        if (newCredits < 0) {
          // ⚠️ INSOLVENTE: non paga, viene escluso dal GP
          await sb.from('gp_exclusions').upsert({
            user_id: u.id,
            race_id: raceId,
            reason: 'Insolvente: crediti ' + currentCredits + 'cr, stipendi ' + stipendi + 'cr',
            excluded_at: new Date().toISOString()
          }, { onConflict: 'user_id,race_id' });
          await sb.from('admin_log').insert({
            action: 'Stipendi GP ' + raceId + ': ' + u.nickname + ' INSOLVENTE (ha ' + currentCredits + 'cr, stipendi ' + stipendi + 'cr) — escluso dal GP',
            by_user: 'system'
          });
        } else {
          // ✅ Paga gli stipendi
          await sb.from('auction_lots').insert({
            item_name: 'STIPENDI:' + raceId + ':' + u.id,
            item_type: 'economy_delta',
            status: 'sold',
            base_price: 0,
            current_bid: stipendi,
            final_price: stipendi, // positivo = spesa (riduce crediti)
            winner_id: u.id,
            notes: 'Stipendi GP ' + raceId + ': ' + stipendi + 'cr (piloti: ' + myDrivers.join(', ') + (myTeamName ? ', scuderia: ' + myTeamName : '') + ')'
          });
          await sb.from('admin_log').insert({
            action: 'Stipendi GP ' + raceId + ': ' + u.nickname + ' -' + stipendi + 'cr (rimane ' + newCredits + 'cr)',
            by_user: 'system'
          });
        }
      }
      // Mostra notifica solo se siamo nell'app
      if (typeof showToast === 'function') showToast('💸 Stipendi GP scalati automaticamente!', 'ok');
    }

    // Controlla se un utente è escluso da un GP (insolvente)
    async function isUserExcluded(userId, raceId) {
      try {
        const { data } = await sb.from('gp_exclusions').select('id').eq('user_id', userId).eq('race_id', raceId).maybeSingle();
        return !!data;
      } catch { return false; }
    }

        async function computeAndSavePts(raceId, result) {
      const [{ data: teams }, { data: preds }, { data: allPups }] = await Promise.all([
        sb.from('fantasy_teams').select('*').eq('race_id', raceId),
        sb.from('predictions').select('*').eq('race_id', raceId),
        sb.from('powerup_purchases').select('*').eq('race_id', raceId).eq('activated', true)
      ]);

      // Carica esclusioni (utenti insolventi) per questo GP
      const { data: exclusions } = await sb.from('gp_exclusions').select('user_id').eq('race_id', raceId);
      const excludedSet = new Set((exclusions || []).map(e => e.user_id));

      let processed = 0;
      for (const team of (teams || [])) {
        // ⛔ Utente insolvente: non calcolare punti né crediti
        if (excludedSet.has(team.user_id)) {
          await sb.from('gp_scores').upsert({
            user_id: team.user_id, race_id: raceId,
            fantasy_pts: 0, predict_pts: 0, total_pts: 0,
            breakdown: { excluded: true, reason: 'Insolvente — stipendi non pagati' },
            computed_at: new Date().toISOString()
          }, { onConflict: 'user_id,race_id' });
          continue; // salta completamente
        }
        const pred = (preds || []).find(p => p.user_id === team.user_id);

        // Carica power-up attivi per questo utente/GP
        const userPups = (allPups || []).filter(p => p.user_id === team.user_id);
        const pupSet = new Set(userPups.map(p => p.powerup_id));
        const powerups = {
          noNegative: pupSet.has('shield'),
          doublePred: pupSet.has('double'),
          turboFantasy: pupSet.has('turbo'),
          eagleBonus: pupSet.has('eagle'),
          doubleTeam: pupSet.has('jolly')
        };

        const { total: fPts, breakdown: fBrk } = calcFantasyPts(team, result, powerups.noNegative, powerups);
        const { total: pPts, breakdown: pBrk } = calcPredPts(pred, result, false, powerups);
        const total = fPts + pPts;

        // Salva punteggio dettagliato
        await sb.from('gp_scores').upsert({
          user_id: team.user_id, race_id: raceId,
          fantasy_pts: fPts, predict_pts: pPts, total_pts: total,
          breakdown: { fantasy: fBrk, predict: pBrk, powerups: Array.from(pupSet) },
          computed_at: new Date().toISOString()
        }, { onConflict: 'user_id,race_id' });

        // Aggiorna profilo: somma diretta (non RPC per evitare doppio conteggio)
        // Prima controlla se questo GP era già calcolato (gp_scores) per non aggiungere due volte
        const { data: existingScore } = await sb.from('gp_scores').select('total_pts').eq('user_id', team.user_id).eq('race_id', raceId).maybeSingle();
        const prevTotal = existingScore?.total_pts || 0;
        const ptsDiff = total - prevTotal; // differenza rispetto al calcolo precedente
        const { data: prof } = await sb.from('profiles').select('total_pts,gps_done').eq('id', team.user_id).single();
        if (prof) {
          const newTotalPts = (prof.total_pts || 0) + ptsDiff;
          const newGpsDone = existingScore ? prof.gps_done : (prof.gps_done || 0) + 1;
          await sb.from('profiles').update({ total_pts: Math.max(0, newTotalPts), gps_done: newGpsDone }).eq('id', team.user_id);
        }
        processed++;
      }

      // ── AUTO-ECONOMIA: stipendi e guadagni per questo GP ──
      await autoApplyEconomy(raceId, result);

      return `${processed} team calcolati.`;
    }

    // Calcola e applica automaticamente stipendi + guadagni per tutti gli utenti dopo un GP
    async function autoApplyEconomy(raceId, result) {
      try {
        const { data: users } = await sb.from("profiles").select("id,nickname");
        // Controlla se economia gia applicata per questo GP
        const { data: prevLog } = await sb.from("admin_log").select("id").ilike("action", "Economia GP " + raceId + ":%").limit(1);
        if (prevLog && prevLog.length > 0) {
          console.log("[autoApplyEconomy] economia gia applicata per", raceId);
          return;
        }
        // Determina se e il primo GP (l'unico dove si puo andare negativi)
        const doneRaceIds = CALENDAR_2026.map(r => r.id);
        const gpIndex = doneRaceIds.indexOf(raceId);
        const isFirstGP = gpIndex === 0;

        // Carica tutti i team per questo GP (team effettivo che ha gareggiato)
        const { data: raceTeams } = await sb.from("fantasy_teams").select("*").eq("race_id", raceId);
        const raceTeamMap = {};
        (raceTeams || []).forEach(t => { raceTeamMap[t.user_id] = t; });

        // Carica esclusioni per questo GP
        const { data: ecoExclusions } = await sb.from('gp_exclusions').select('user_id').eq('race_id', raceId);
        const ecoExcludedSet = new Set((ecoExclusions || []).map(e => e.user_id));

        for (const u of (users || [])) {
          // ⛔ Utente insolvente: nessun guadagno né stipendio (già non ha pagato)
          if (ecoExcludedSet.has(u.id)) {
            await sb.from("admin_log").insert({
              action: "Economia GP " + raceId + ": " + u.nickname + " ESCLUSO (insolvente) — nessun guadagno",
              by_user: "system"
            });
            continue;
          }
          // Usa il team che ha effettivamente gareggiato in questo GP
          const raceTeam = raceTeamMap[u.id];
          const myDrivers = [raceTeam?.driver1, raceTeam?.driver2].filter(Boolean);
          const myTeam = raceTeam?.team1 || null;

          let stipendi = 0, guadagni = 0;
          myDrivers.forEach(dName => {
            const drv = DRIVERS_2026.find(d => d.name === dName);
            if (drv) stipendi += drv.salary || 0;
          });
          if (myTeam) stipendi += (TEAM_SALARIES_2026[myTeam] || 0);

          myDrivers.forEach(dName => {
            const pos = getDriverPosition(dName, result);
            if (pos > 0) guadagni += (DRIVER_EARNINGS[pos] || 3);
            else {
              const dnfs = (result.dnf_drivers || "").split(",").map(s => s.trim());
              if (!dnfs.includes(dName)) guadagni += 2;
            }
          });
          if (myTeam) guadagni += calcTeamEarnings(myTeam, result);

          const delta = guadagni - stipendi;

          // Calcola crediti attuali (da auction_lots)
          const { data: uLotsEco } = await sb.from("auction_lots").select("final_price,item_type").eq("winner_id", u.id).eq("status", "sold");
          const spentAuction = (uLotsEco || []).filter(l => l.item_type !== "economy_delta").reduce((s, l) => s + (l.final_price || 0), 0);
          const { data: pups } = await sb.from("powerup_purchases").select("cost").eq("user_id", u.id);
          const spentPU = (pups || []).reduce((s, p) => s + (p.cost || 0), 0);
          // Somma anche lotti economia precedenti (delta negativi aggiungono, positivi tolgono)
          const { data: ecoLots } = await sb.from("auction_lots").select("final_price,winner_id,item_type")
            .eq("item_type", "economy_delta").eq("winner_id", u.id).eq("status", "sold");
          const spentEco = (ecoLots || []).reduce((s, l) => s + (l.final_price || 0), 0);
          const currentCredits = AUCTION_BUDGET - spentAuction - spentPU - spentEco;
          const newCredits = currentCredits + delta;

          // Dal secondo GP in poi non si puo andare sotto 0
          if (!isFirstGP && newCredits < 0) {
            await sb.from("admin_log").insert({
              action: "Economia GP " + raceId + ": " + u.nickname + " andrebbe a " + newCredits + "cr — applicato parzialmente al limite 0",
              by_user: "system"
            });
            // Applica solo quello che porta a 0
            const clamped = currentCredits; // tutta la spesa porta a 0 ma non sotto
            if (clamped > 0) {
              await sb.from("auction_lots").insert({
                item_name: "ECO:" + raceId + ":" + u.id,
                item_type: "economy_delta",
                status: "sold",
                base_price: 0,
                current_bid: clamped,
                final_price: clamped,
                winner_id: u.id,
                notes: "Economia " + raceId + " (capped a 0): guadagni " + guadagni + "cr - stipendi " + stipendi + "cr"
              });
            }
            continue;
          }

          // Traccia il delta crediti come lotto economia
          if (delta !== 0) {
            // final_price positivo = spesa (riduce crediti), negativo = guadagno (aumenta crediti)
            const finalPrice = -delta; // delta positivo (guadagno netto) → final_price negativo (riduce la spesa)
            await sb.from("auction_lots").insert({
              item_name: "ECO:" + raceId + ":" + u.id,
              item_type: "economy_delta",
              status: "sold",
              base_price: 0,
              current_bid: Math.abs(delta),
              final_price: finalPrice,
              winner_id: u.id,
              notes: "Economia " + raceId + ": guadagni " + guadagni + "cr - stipendi " + stipendi + "cr = " + (delta >= 0 ? "+" : "") + delta + "cr"
            });
          }

          await sb.from("admin_log").insert({
            action: "Economia GP " + raceId + ": " + u.nickname + " netto " + (delta >= 0 ? "+" : "") + delta + "cr (stip " + stipendi + " guad " + guadagni + ")",
            by_user: "system"
          });
        }
      } catch (e) {
        console.error("[autoApplyEconomy] errore:", e);
      }
    }

    async function recalcAllPts() {
      const statusEl = document.getElementById('recalc-status');
      const btn = document.getElementById('recalc-btn');
      btn.disabled = true;
      statusEl.textContent = '⟳ Reset punti...';

      // Reset tutti i profili
      const { data: profiles } = await sb.from('profiles').select('id');
      for (const p of (profiles || [])) {
        await sb.from('profiles').update({ total_pts: 0, gps_done: 0 }).eq('id', p.id);
      }

      // Elimina gp_scores
      await sb.from('gp_scores').delete().neq('race_id', '____');

      // Ricalcola per ogni GP con risultati
      const { data: results } = await sb.from('race_results').select('*');
      let done = 0;
      for (const res of (results || [])) {
        statusEl.textContent = `⟳ GP ${done + 1}/${results.length}: ${res.race_id}`;
        await computeAndSavePts(res.race_id, res);
        done++;
      }

      btn.disabled = false;
      statusEl.innerHTML = '<span style="color:var(--green)">✅ Ricalcolo completato! ' + done + ' GP elaborati.</span>';
      await sb.from('admin_log').insert({ action: 'Ricalcolo completo punti', by_user: currentProfile?.nickname || 'admin' });
      invalidateCache(); // reset tutta la cache dopo ricalcolo
      showToast('✅ Punti ricalcolati!', 'ok');
    }

    async function savePrices() {
      const updates = [];
      DRIVERS_2026.forEach(d => {
        const el = document.getElementById('pr_' + d.abbr);
        if (el) {
          const newPrice = Math.max(5, Math.min(120, parseInt(el.value) || d.price));
          d.price = newPrice;
          updates.push({ driver_name: d.name, price: newPrice, updated_at: new Date().toISOString() });
        }
      });
      TEAMS_2026.forEach(t => {
        const el = document.getElementById('pr_team_' + t.replace(/ /g, '_'));
        if (el) {
          const newPrice = Math.max(5, Math.min(150, parseInt(el.value) || TEAM_PRICES_2026[t] || 20));
          TEAM_PRICES_2026[t] = newPrice;
          updates.push({ driver_name: 'TEAM:' + t, price: newPrice, updated_at: new Date().toISOString() });
        }
      });
      for (const u of updates) {
        await sb.from('driver_prices').upsert(u, { onConflict: 'driver_name' });
      }
      await sb.from('admin_log').insert({ action: 'Prezzi aggiornati manualmente', by_user: currentProfile?.nickname || 'admin' });
      closeMod();
      showToast('✅ Prezzi aggiornati!', 'ok');
    }

    // Shortcut per aprire il pannello modifica dal Live (senza essere nell'admin)
    async function openManualResultLive(raceId) {
      if (!currentProfile || currentProfile.role !== 'admin') {
        showToast('Solo gli admin possono modificare i risultati', 'err');
        return;
      }
      document.getElementById('moverlay').classList.remove('hidden');
      await openManualResult(raceId);
    }

    async function openManualResult(raceId) {
      const race = CALENDAR_2026.find(r => r.id === raceId);
      const { data: existing } = await sb.from('race_results').select('*').eq('race_id', raceId).maybeSingle();
      const c = document.getElementById('mcontent');
      const dOpt = (id, val) => `<select class="fi fi-sel" id="mr_${id}">
    <option value="">— Seleziona —</option>
    ${DRIVERS_2026.map(d => `<option value="${d.name}"${val === d.name ? ' selected' : ''}>#${d.num} ${d.name}</option>`).join('')}
  </select>`;
      c.innerHTML = `<span class="mclose" onclick="closeMod()">✕</span>
    <div class="mtitle">${race?.flag || '🏁'} ${race?.name || raceId}</div>
    ${existing ? '<div class="status-banner sb-ok">✅ Risultati già presenti — stai sovrascrivendo</div>' : ''}
    ${existing?.source === 'openf1_auto' ? '<div class="status-banner sb-info">📡 Importati automaticamente da OpenF1</div>' : ''}
    <div class="fg"><label>🥇 Pole / P1 griglia</label>${dOpt('pole', existing?.pole)}</div>
    <div class="fg"><label>⏱️ Giro Veloce</label>${dOpt('fastest', existing?.fastest)}</div>
    <div class="fg"><label>⭐ Driver of the Day</label>${dOpt('dotd', existing?.dotd)}</div>
    
    <details style="margin-bottom:10px" open>
      <summary style="font-size:11px;font-weight:700;letter-spacing:1px;color:var(--t3);text-transform:uppercase;cursor:pointer;padding:8px;background:var(--s2);border-radius:8px">📊 Classifica Completa & Distacchi (P1-P22)</summary>
      <div style="margin-top:8px;font-size:10px;color:var(--t3);margin-bottom:8px">
        Inserisci la classifica completa con distacchi stile App F1 (es: +1.234, +1 lap, DNF).
      </div>
      ${Array.from({ length: 22 }, (_, i) => i + 1).map(pos => {
        let dName = existing?.[`p${pos}`] || (existing?.gap_data && Object.entries(existing.gap_data).find(([_, v]) => v.pos === pos)?.[0]) || '';
        let dGap = (existing?.gap_data && Object.entries(existing.gap_data).find(([_, v]) => v.pos === pos)?.[1]?.gap) || '';
        return `
      <div style="display:grid;grid-template-columns:32px 1fr 100px;gap:6px;align-items:center;margin-bottom:5px">
        <div style="font-size:11px;font-weight:700;color:var(--t3)">P${pos}</div>
        ${dOpt('pos' + pos, dName)}
        <input class="fi" type="text" id="mr_gap${pos}" placeholder="+1.234" value="${dGap}" style="font-size:11px">
      </div>`;
      }).join('')}
    </details>

    <div class="stitle" style="margin-top:16px">🏁 Qualifiche Completa (Q1/Q2/Q3)</div>
    <div style="font-size:10px;color:var(--t3);margin-bottom:8px">Inserisci i piloti in ordine di eliminazione: Q1 elimina P16-20, Q2 elimina P11-15, Q3 determina P1-P10.</div>
    <div style="font-size:11px;font-weight:700;color:var(--green);margin:6px 0 4px">🟢 Q3 — Top 10 (P1-P10)</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:10px">
      ${[1,2,3,4,5,6,7,8,9,10].map(i => '<div><div style="font-size:9px;color:var(--green);margin-bottom:3px">Q3 P' + i + '</div>' + dOpt('qual' + i, existing?.['qual_p' + i] || '') + '</div>').join('')}
    </div>
    <div style="font-size:11px;font-weight:700;color:var(--yellow);margin:6px 0 4px">🟡 Q2 — Eliminati (P11-P15)</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:10px">
      ${[11,12,13,14,15].map(i => '<div><div style="font-size:9px;color:var(--yellow);margin-bottom:3px">Q2 P' + i + '</div>' + dOpt('q2p' + i, existing?.['q2_p' + i] || '') + '</div>').join('')}
    </div>
    <div style="font-size:11px;font-weight:700;color:var(--red);margin:6px 0 4px">🔴 Q1 — Eliminati (P16-P20)</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:10px">
      ${[16,17,18,19,20].map(i => '<div><div style="font-size:9px;color:var(--t3);margin-bottom:3px">Q1 P' + i + '</div>' + dOpt('q1p' + i, existing?.['q1_p' + i] || '') + '</div>').join('')}
    </div>
    ${race?.sprint ? `
    <div class="fg"><label>🟣 Sprint Vincitore</label>${dOpt('spr', existing?.sprint_win)}</div>
    <div class="fg"><label>🟣 Sprint P2</label>${dOpt('spr2', existing?.sprint_p2 || '')}</div>
    <div class="fg"><label>🟣 Sprint P3</label>${dOpt('spr3', existing?.sprint_p3 || '')}</div>
    <div class="fg"><label>🟣 Sprint Giro Veloce</label>${dOpt('sprfast', existing?.sprint_fastest || '')}</div>
    <div class="fg"><label>💥 Sprint DNF (virgola)</label><input class="fi" type="text" id="mr_sprdnf" value="${existing?.sprint_dnf_drivers || ''}" placeholder="Piloti ritirati in sprint"></div>
    `: ''}
    <div class="fg"><label>🚗 N° Safety Car</label><input class="fi" type="number" id="mr_sc" value="${existing?.sc_count || 0}" min="0" max="10"></div>
    <div class="fg"><label>💥 N° Ritiri totali</label><input class="fi" type="number" id="mr_retires" value="${existing?.retires_count || 0}" min="0" max="20"></div>
    <div class="fg"><label>💥 Primo pilota ritirato</label>${dOpt('firstdnf', existing?.first_dnf || '')}</div>
    <div class="fg"><label>🚩 Red Flag</label><select class="fi fi-sel" id="mr_rf"><option value="false">No</option><option value="true"${existing?.rf ? ' selected' : ''}>Sì</option></select></div>
    <div class="fg"><label>💥 Piloti DNF (virgola)</label><input class="fi" type="text" id="mr_dnf" value="${existing?.dnf_drivers || ''}" placeholder="Verstappen, Hamilton"></div>
    <div class="fg"><label>🚫 Piloti DNS (virgola)</label><input class="fi" type="text" id="mr_dns" value="${existing?.dns_drivers || ''}" placeholder="Piloti che non partono"></div>
    <div class="fg"><label>⚠️ Penalità (virgola)</label><input class="fi" type="text" id="mr_pen" value="${existing?.penalty_drivers || ''}" placeholder="Leclerc"></div>
    <div class="fg"><label>⚙️ Team Fastest Pit Stop</label><select class="fi fi-sel" id="mr_fastpit">
      <option value="">— Seleziona —</option>
      ${TEAMS_2026.map(t => `<option value="${t}"${existing?.fastest_pit_team === t ? ' selected' : ''}>${t}</option>`).join('')}
    </select></div>
    <div class="fg"><label>🔄 Miglior Rimonta (pilota)</label>${dOpt('comeback', existing?.best_comeback || '')}</div>
    <div class="fg" style="background:rgba(255,200,0,.05);border:1px solid rgba(255,200,0,.2);border-radius:8px;padding:8px">
      <label>📊 Miglior Risultato Weekend</label>
      <div style="font-size:10px;color:var(--yellow);margin-bottom:6px">⚠️ Usa il pannello "Calcola GP" per inserire questo valore in modo dedicato.</div>
      ${dOpt('bestweekend', existing?.best_weekend_driver || '')}
    </div>
    <div class="fg"><label>🏎️ Costruttore più performante</label><select class="fi fi-sel" id="mr_constrbest">
      <option value="">— Seleziona —</option>
      ${TEAMS_2026.map(t => `<option value="${t}"${existing?.constructor_best === t ? ' selected' : ''}>${t}</option>`).join('')}
    </select></div>

    <button class="btn btn-r btn-w" onclick="saveManualResult('${raceId}')">💾 Salva e Calcola Punti</button>`;
    }

    async function saveManualResult(raceId) {
      const g = id => document.getElementById('mr_' + id)?.value || null;
      const race = CALENDAR_2026.find(r => r.id === raceId);
      const result = {
        race_id: raceId,
        pole: g('pole'),
        p1: g('pos1'), p2: g('pos2'), p3: g('pos3'),
        p4: g('pos4'), p5: g('pos5'), p6: g('pos6'), p7: g('pos7'), p8: g('pos8'), p9: g('pos9'), p10: g('pos10'),
        fastest: g('fastest'),
        dotd: g('dotd') || null,
        p2_qual: g('p2qual') || null,
        qual_p1: g('qual1') || null, qual_p2: g('qual2') || null, qual_p3: g('qual3') || null,
        qual_p4: g('qual4') || null, qual_p5: g('qual5') || null, qual_p6: g('qual6') || null,
        qual_p7: g('qual7') || null, qual_p8: g('qual8') || null, qual_p9: g('qual9') || null,
        qual_p10: g('qual10') || null,
        q2_p11: g('q2p11') || null, q2_p12: g('q2p12') || null, q2_p13: g('q2p13') || null,
        q2_p14: g('q2p14') || null, q2_p15: g('q2p15') || null,
        q1_p16: g('q1p16') || null, q1_p17: g('q1p17') || null, q1_p18: g('q1p18') || null,
        q1_p19: g('q1p19') || null, q1_p20: g('q1p20') || null,
        sprint_win: race?.sprint ? g('spr') : null,
        sprint_p2: race?.sprint ? g('spr2') : null,
        sprint_p3: race?.sprint ? g('spr3') : null,
        sprint_fastest: race?.sprint ? g('sprfast') : null,
        sprint_order: race?.sprint || false,
        sprint_dnf_drivers: race?.sprint ? (document.getElementById('mr_sprdnf')?.value || '') : null,
        sc_count: parseInt(document.getElementById('mr_sc')?.value) || 0,
        retires_count: parseInt(document.getElementById('mr_retires')?.value) || 0,
        first_dnf: g('firstdnf'),
        rf: document.getElementById('mr_rf')?.value === 'true',
        dnf_drivers: document.getElementById('mr_dnf')?.value || '',
        dns_drivers: document.getElementById('mr_dns')?.value || '',
        penalty_drivers: document.getElementById('mr_pen')?.value || '',
        fastest_pit_team: document.getElementById('mr_fastpit')?.value || null,
        best_comeback: document.getElementById('mr_comeback')?.value || null,
        best_weekend_driver: document.getElementById('mr_bestweekend')?.value || null,
        constructor_best: document.getElementById('mr_constrbest')?.value || null,
        source: 'manual',
        fetched_at: new Date().toISOString()
      };

      // Calc team_points for predict scoring
      const teamPoints = {};
      TEAMS_2026.forEach(team => {
        const td = DRIVERS_2026.filter(d => d.team === team).map(d => d.name);
        const top10 = [result.p1, result.p2, result.p3, result.p4, result.p5, result.p6, result.p7, result.p8, result.p9, result.p10];
        teamPoints[team] = td.filter(d => top10.includes(d)).length;
      });
      result.team_points = teamPoints;

      // Classifica completa gap_data (P1-P22 da input manuale)
      const gap_data = {};
      for (let pos = 1; pos <= 22; pos++) {
        const dName = document.getElementById('mr_pos' + pos)?.value;
        const dGap = document.getElementById('mr_gap' + pos)?.value;
        if (dName) {
          const isDNF = dGap?.toUpperCase().includes('DNF') || dGap?.toUpperCase().includes('RET');
          gap_data[dName] = { pos, gap: dGap || '', status: isDNF ? 'DNF' : 'Finished' };
        }
      }
      result.gap_data = gap_data;

      const { error } = await sb.from('race_results').upsert(sanitizeResult(result), { onConflict: 'race_id' });
      if (error) { showToast('❌ ' + error.message, 'err'); return; }
      closeMod();

      await computeAndSavePts(raceId, result);
      await autoUpdateMarketPrices(result);
      await sb.from('admin_log').insert({ action: `Risultati manuali ${raceId}`, by_user: currentProfile?.nickname || 'admin' });
      showToast('✅ Risultati salvati e punti calcolati!', 'ok');
      renderHome(); renderAdminLog();
    }

    async function promoteUser(uid) {
      await sb.from('profiles').update({ role: 'admin' }).eq('id', uid);
      await sb.from('admin_log').insert({ action: 'Utente promosso admin', by_user: currentProfile?.nickname || 'admin' });
      openMod('users');
      showToast('✅ Utente promosso', 'ok');
    }

    async function resetUserPts(uid, nick) {
      if (!confirm(`Reset punti di ${nick}?`)) return;
      await sb.from('profiles').update({ total_pts: 0, gps_done: 0 }).eq('id', uid);
      await sb.from('admin_log').insert({ action: `Reset punti ${nick}`, by_user: currentProfile?.nickname || 'admin' });
      openMod('users');
      showToast('✅ Punti resettati', 'ok');
    }
