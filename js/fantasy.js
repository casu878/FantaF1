    // ══════════════════ FANTASY TEAM ══════════════════

    let fantState = { driver1: null, driver2: null, driver3: null, team1: null, team2: null, locked: false };

    async function renderFantasy() {
      const next = getNextRace();
      const el = document.getElementById('fantasy-content');
      if (!next) { el.innerHTML = '<div class="status-banner sb-info">Nessun GP disponibile.</div>'; return; }
      // Mostra skeleton immediato
      if (!el.innerHTML.trim() || el.innerHTML.includes('Caricamento')) {
        el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--t3)"><div style="font-size:24px;margin-bottom:8px">⟳</div><div style="font-size:12px;letter-spacing:1px">Caricamento team...</div></div>';
      }

      // Carica il team dell'utente con cache
      const myTeams = await cachedQuery('myteams_' + currentUser.id, async () => {
        const { data } = await sb.from('fantasy_teams').select('*').eq('user_id', currentUser.id).order('saved_at', { ascending: false });
        return data;
      }, 15000);
      const ex = (myTeams || []).find(t => t.race_id === next.id) || (myTeams || [])[0] || null;

      fantState = {
        driver1: ex?.driver1 || null, driver2: ex?.driver2 || null,
        team1: ex?.team1 || null,
        locked: true
      };

      renderFantasyUI(next);
    }

    function renderFantasyUI(next) {
      const isAdmin = currentProfile?.role === 'admin';
      const el = document.getElementById('fantasy-content');

      // Calcola stato mercato in modo asincrono
      el.innerHTML = `
    <div style="font-family:'Exo 2',sans-serif;font-weight:900;font-size:18px;text-transform:uppercase;margin-bottom:10px">
      ${next.flag} R${next.round} · ${next.name}
    </div>

    <!-- STATO MERCATO -->
    <div id="market-status-banner"></div>

    <!-- ACCESSO ASTA -->
    <div style="display:flex;gap:8px;margin-bottom:11px">
      <button class="btn btn-r" style="flex:1;background:linear-gradient(90deg,#1a1000,#2a1800);border:1px solid var(--gold);color:var(--gold)" onclick="openMod('auction')">&#x1F528; Asta Live</button>
      <button class="btn btn-g" style="flex:1;border-color:rgba(192,96,255,.4);color:var(--purple)" onclick="openReleasePanel()">&#x1F4B1; Trasferimenti</button>
    </div>

    <!-- IL MIO TEAM (sola lettura) -->
    <div class="myteam-display">
      <div style="font-family:'Exo 2',sans-serif;font-weight:900;font-size:12px;letter-spacing:2px;color:var(--t3);text-transform:uppercase;margin-bottom:10px">&#x1F3CE;&#xFE0F; Il Mio Team</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px">
        ${makeDriverSlot('Pilota 1', fantState.driver1)}
        ${makeDriverSlot('Pilota 2', fantState.driver2)}
        ${makeTeamSlot('Scuderia', fantState.team1)}
      </div>
      <div style="margin-top:10px;font-size:11px;color:var(--t3);text-align:center">&#x1F512; Il team si aggiorna solo tramite l'Asta quando il mercato è aperto</div>
    </div>

    <!-- POWER-UP SHOP -->
    <div class="stitle" style="margin-top:20px">&#x26A1; Power-Up Shop</div>
    <div id="pu-credits-banner"></div>
    <div id="pu-active-banner"></div>
    <div id="pu-shop-grid" class="pu-shop-grid"></div>

    <!-- TEAM DI TUTTI -->
    <div class="stitle" style="margin-top:20px">&#x1F465; Team di Tutti</div>
    <div id="all-teams-box"><div style="color:var(--t3);font-size:12px;text-align:center;padding:16px">&#x23F3; Caricamento...</div></div>
  `;

      // Carica stato mercato, power-up e team di tutti in background
      loadMarketStatus();
      loadAllTeams(next.id);
      loadPowerupShop(next.id);
    }

    // ══════════════════ POWER-UP SHOP ══════════════════

    async function getUserCredits(userId) {
      // Crediti = AUCTION_BUDGET - speso in asta - speso in power-up +/- delta economia (stipendi/guadagni)
      // I lotti economy_delta hanno final_price negativo se guadagno netto (aumentano i crediti),
      // positivo se spesa netta (riducono i crediti).
      const [{ data: lots }, { data: pups }] = await Promise.all([
        sb.from('auction_lots').select('final_price,item_type').eq('winner_id', userId).eq('status', 'sold'),
        sb.from('powerup_purchases').select('cost').eq('user_id', userId)
      ]);
      const spentAuction = (lots || []).filter(l => l.item_type !== 'economy_delta').reduce((s, l) => s + (l.final_price || 0), 0);
      const spentEco = (lots || []).filter(l => l.item_type === 'economy_delta').reduce((s, l) => s + (l.final_price || 0), 0);
      const spentPU = (pups || []).reduce((s, p) => s + (p.cost || 0), 0);
      return AUCTION_BUDGET - spentAuction - spentPU - spentEco; // crediti residui
    }

    async function loadPowerupShop(raceId) {
      const gridEl = document.getElementById('pu-shop-grid');
      const creditsEl = document.getElementById('pu-credits-banner');
      const activeEl = document.getElementById('pu-active-banner');
      if (!gridEl || !currentUser) return;

      // ── Controlla se qualifiche già iniziate ──
      const raceObj = CALENDAR_2026.find(r => r.id === raceId);
      const qualLocked = raceObj ? new Date(raceObj.sessions.qual) <= new Date() : false;

      // Carica acquisti già fatti per questo GP
      const [{ data: purchased }, { data: lots }] = await Promise.all([
        sb.from('powerup_purchases').select('*').eq('user_id', currentUser.id).eq('race_id', raceId),
        sb.from('auction_lots').select('final_price,item_type').eq('winner_id', currentUser.id).eq('status', 'sold')
      ]);

      const spentAuction = (lots || []).filter(l => l.item_type !== 'economy_delta').reduce((s, l) => s + (l.final_price || 0), 0);
      const spentEco = (lots || []).filter(l => l.item_type === 'economy_delta').reduce((s, l) => s + (l.final_price || 0), 0);
      const spentPU = (purchased || []).reduce((s, p) => s + (p.cost || 0), 0);
      const availableCredits = AUCTION_BUDGET - spentAuction - spentPU - spentEco;

      // Banner crediti + eventuale lock
      if (creditsEl) {
        creditsEl.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.18);border-radius:9px;padding:9px 13px;margin-bottom:6px">
        <div style="font-size:11px;color:var(--t2)">💰 Crediti disponibili per Power-Up</div>
        <div style="font-family:'Exo 2',sans-serif;font-weight:900;font-size:22px;color:var(--gold)">${availableCredits} <span style="font-size:11px;font-weight:400">cr</span></div>
      </div>
      ${qualLocked ? '<div class="lock-stripe" style="margin-bottom:8px;border-radius:8px">🔒 Qualifiche iniziate — acquisti Power-Up chiusi per questo weekend</div>' : ''}
    `;
      }

      // Banner power-up attivi
      const activePUs = (purchased || []).filter(p => p.activated);
      if (activeEl) {
        activeEl.innerHTML = activePUs.length
          ? activePUs.map(p => {
            const pu = POWERUPS[p.powerup_id];
            if (!pu) return '';
            return `<div class="pu-active-banner" style="background:rgba(255,215,0,.05);border:1px solid rgba(255,215,0,.25);color:var(--gold)">
            <span style="font-size:16px">${pu.ico}</span>
            <span><strong>${pu.name}</strong> attivo questo GP!</span>
          </div>`;
          }).join('')
          : '';
      }

      const purchasedMap = {};
      (purchased || []).forEach(p => purchasedMap[p.powerup_id] = p);

      // Render griglia — bloccata dopo inizio qualifiche
      gridEl.innerHTML = Object.values(POWERUPS).map(pu => {
        const p = purchasedMap[pu.id];
        const owned = !!p;
        const blocked = qualLocked && !owned;
        const canAfford = !blocked && availableCredits >= pu.cost;
        const extraCls = owned ? 'pu-owned' : (blocked || !canAfford ? 'pu-used' : '');
        const borderColor = owned ? pu.color : 'var(--border)';

        return `<div class="pu-card ${extraCls}" style="border-color:${borderColor};background:var(--s1);${blocked ? 'cursor:not-allowed' : ''}"
        onclick="${owned || blocked ? '' : (canAfford ? `buyPowerup('${pu.id}','${raceId}',${pu.cost})` : '')}">
      ${owned ? `<div class="pu-owned-badge" style="background:${pu.color};color:#000">✓ ATTIVO</div>` : ''}
      ${blocked ? `<div class="pu-owned-badge" style="background:#333;color:#888">🔒</div>` : ''}
      <div class="pu-ico" style="opacity:${blocked ? '.4' : '1'}">${pu.ico}</div>
      <div class="pu-name" style="color:${owned ? pu.color : blocked ? 'var(--t3)' : 'var(--t1)'}">${pu.name}</div>
      <div class="pu-desc">${pu.desc}</div>
      ${owned
            ? `<div class="pu-price" style="color:${pu.color}">✅ Acquistato</div>`
            : blocked
              ? `<div class="pu-price" style="color:var(--t3)">🔒 Chiuso</div>`
              : `<div class="pu-price" style="color:${canAfford ? 'var(--gold)' : 'var(--t3)'}">${canAfford ? '🛒' : ''} ${pu.cost} cr</div>`
          }
    </div>`;
      }).join('');
    }

    async function buyPowerup(puId, raceId, cost) {
      if (!currentUser) return;
      const pu = POWERUPS[puId];
      if (!pu) return;

      // ── Lock dopo inizio qualifiche ──
      const raceObj = CALENDAR_2026.find(r => r.id === raceId);
      if (raceObj && new Date(raceObj.sessions.qual) <= new Date()) {
        showToast('🔒 Qualifiche iniziate — acquisti Power-Up chiusi per questo GP!', 'err');
        invalidateCache('pu_' + raceId + '_' + currentUser.id);
        loadPowerupShop(raceId); // aggiorna UI
        return;
      }

      if (!confirm(`Acquistare "${pu.ico} ${pu.name}" per ${cost} crediti?\n\n${pu.desc}\n\nSi attiverà automaticamente su questo GP.`)) return;

      // Verifica crediti
      const [{ data: lots }, { data: existing }] = await Promise.all([
        sb.from('auction_lots').select('final_price').eq('winner_id', currentUser.id).eq('status', 'sold'),
        sb.from('powerup_purchases').select('cost').eq('user_id', currentUser.id)
      ]);
      const spentAuction = (lots || []).reduce((s, l) => s + (l.final_price || 0), 0);
      const spentPU = (existing || []).reduce((s, p) => s + (p.cost || 0), 0);
      const available = AUCTION_BUDGET - spentAuction - spentPU;

      if (available < cost) {
        showToast(`❌ Crediti insufficienti! Hai ${available}cr, servono ${cost}cr`, 'err');
        return;
      }

      // Controlla se già acquistato per questo GP
      const { data: alreadyBought } = await sb.from('powerup_purchases')
        .select('id').eq('user_id', currentUser.id).eq('race_id', raceId).eq('powerup_id', puId).maybeSingle();
      if (alreadyBought) {
        showToast('⚠️ Hai già questo Power-Up per questo GP!', 'err');
        return;
      }

      const { error } = await sb.from('powerup_purchases').insert({
        user_id: currentUser.id,
        race_id: raceId,
        powerup_id: puId,
        cost: cost,
        activated: true
      });

      if (error) { showToast('❌ ' + error.message, 'err'); return; }

      showToast(`✅ ${pu.ico} ${pu.name} acquistato! (−${cost}cr)`, 'gold');
      await sb.from('admin_log').insert({
        action: `PowerUp ${puId} acquistato da ${currentProfile?.nickname || '?'} per GP ${raceId} (${cost}cr)`,
        by_user: currentProfile?.nickname || 'system'
      });
      loadPowerupShop(raceId);
    }

    // Recupera power-up attivi per un utente/GP (usato nel calcolo punti)
    async function getActivePowerups(userId, raceId) {
      const { data } = await sb.from('powerup_purchases')
        .select('powerup_id').eq('user_id', userId).eq('race_id', raceId).eq('activated', true);
      const set = new Set((data || []).map(p => p.powerup_id));
      return {
        noNegative: set.has('shield'),
        doublePred: set.has('double'),
        turboFantasy: set.has('turbo'),
        eagleBonus: set.has('eagle'),
        doubleTeam: set.has('jolly')
      };
    }

    async function loadMarketStatus() {
      const banner = document.getElementById('market-status-banner');
      if (!banner) return;
      try {
        const { data: astate } = await sb.from('auction_state').select('market_open').maybeSingle();
        const open = astate?.market_open || false;
        banner.innerHTML = open
          ? '<div class="status-banner" style="background:linear-gradient(90deg,#002b00,var(--s2));border-color:var(--green);color:var(--green);font-weight:700;margin-bottom:8px">&#x1F7E2; Mercato APERTO &mdash; L\'asta &egrave; in corso!</div>'
          : '<div class="status-banner sb-info" style="margin-bottom:8px">&#x1F534; Mercato CHIUSO &mdash; Attendi l\'apertura dell\'asta per modificare il team</div>';
      } catch (e) { banner.innerHTML = ''; }
    }

    async function loadAllTeams(raceId) {
      const box = document.getElementById('all-teams-box');
      if (!box) return;
      // Carica tutti i team con cache 30s
      const [users, teams] = await Promise.all([
        cachedQuery('allteams_users', async () => {
          const { data } = await sb.from('profiles').select('id,nickname,avatar,color').order('nickname');
          return data;
        }),
        cachedQuery('allteams_' + raceId, async () => {
          const { data } = await sb.from('fantasy_teams').select('user_id,driver1,driver2,team1').eq('race_id', raceId);
          return data;
        })
      ]);

      // Per utenti senza team in questo GP, prendi l'ultimo salvato
      const teamMap = {};
      (teams || []).forEach(t => { teamMap[t.user_id] = t; });

      const missingUsers = (users || []).filter(u => !teamMap[u.id]);
      if (missingUsers.length) {
        const lastTeams = await cachedQuery('lastteams_' + raceId, async () => {
          const { data } = await sb.from('fantasy_teams')
            .select('user_id,driver1,driver2,team1,race_id,saved_at')
            .order('saved_at', { ascending: false });
          return data;
        });
        if (lastTeams) {
          const seen = new Set();
          lastTeams.forEach(t => { if (!seen.has(t.user_id)) { seen.add(t.user_id); teamMap[t.user_id] = t; } });
        }
      }

      if (!users || !users.length) {
        box.innerHTML = '<div style="color:var(--t3);font-size:12px;text-align:center;padding:16px">Nessun giocatore trovato.</div>';
        return;
      }

      box.innerHTML = (users || []).map(p => {
        const t = teamMap[p.id];
        const isMe = p.id === currentUser?.id;
        const d1 = DRIVERS_2026.find(x => x.name === t?.driver1);
        const d2 = DRIVERS_2026.find(x => x.name === t?.driver2);
        const tc1 = DRIVERS_2026.filter(x => x.team === t?.team1)[0]?.tc || '666666';
        return `<div style="background:var(--s2);border:1px solid ${isMe ? 'var(--red)' : 'var(--border)'};border-radius:12px;padding:12px;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div class="av" style="background:${p.color || '#333'};width:30px;height:30px;font-size:14px;flex-shrink:0">${p.avatar || '&#x1F3CE;'}</div>
        <div style="font-weight:800;font-size:14px">${p.nickname || '?'}${isMe ? ' <span style="font-size:10px;color:var(--red)">(tu)</span>' : ''}</div>
      </div>
      ${t ? `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
        <div style="background:var(--s1);border-radius:8px;padding:9px;text-align:center;border:1px solid var(--border)">
          <div style="font-size:9px;color:#${d1?.tc || '666'};font-weight:700">${d1?.team || ''}</div>
          <div style="font-weight:800;font-size:13px;margin-top:2px">${t.driver1 ? t.driver1.split(' ').pop() : '—'}</div>
        </div>
        <div style="background:var(--s1);border-radius:8px;padding:9px;text-align:center;border:1px solid var(--border)">
          <div style="font-size:9px;color:#${d2?.tc || '666'};font-weight:700">${d2?.team || ''}</div>
          <div style="font-weight:800;font-size:13px;margin-top:2px">${t.driver2 ? t.driver2.split(' ').pop() : '—'}</div>
        </div>
        <div style="background:var(--s1);border-radius:8px;padding:9px;text-align:center;border:1px solid var(--border)">
          <div style="font-size:9px;color:var(--t3);font-weight:700">SCUDERIA</div>
          <div style="font-weight:800;font-size:11px;margin-top:2px;color:#${tc1}">${t.team1 || '—'}</div>
        </div>
      </div>` : '<div style="color:var(--t3);font-size:11px;text-align:center;padding:8px">&#x23F3; Nessun team ancora</div>'}
    </div>`;
      }).join('');
    }



    function encodeDriver(name) { return name.replace(/'/g, "\\'"); }

    function makeTeamSlot(label, tname) {
      const tp = tname ? (TEAM_PRICES_2026[tname] || 10) : null;
      const tDrivers = tname ? DRIVERS_2026.filter(d => d.team === tname) : [];
      const tc = tDrivers[0]?.tc || '555';
      return `<div class="myteam-slot${tname ? ' filled' : ''}">
    <div class="slot-label">${label}</div>
    <div class="slot-val" style="color:${tname ? '#' + tc : 'var(--t3)'};font-size:11px">${tname || '—'}</div>
    ${tp ? `<div style="font-size:9px;color:var(--t3);margin-top:1px">💰${tp}cr</div>` : ''}
  </div>`;
    }

    function selectTeam(tname) {
      if (fantState.team1 === tname) fantState.team1 = null;
      else if (fantState.team2 === tname) fantState.team2 = null;
      else if (!fantState.team1) fantState.team1 = tname;
      else if (!fantState.team2) fantState.team2 = tname;
      else { showToast('❌ Hai già 2 scuderie. Deselezionane una.', 'err'); return; }
      const used = getBudgetUsed();
      if (used > BUDGET_TOTAL) showToast('⚠️ Budget superato di ' + (used - BUDGET_TOTAL) + ' cr!', 'err');
      const next = getNextRace();
      if (next) renderFantasyUI(next, new Set(), new Set(), fantState.locked);
    }
    function makeDriverSlot(label, name) {
      const d = DRIVERS_2026.find(x => x.name === name);
      return `<div class="myteam-slot${name ? ' filled' : ''}">
    <div class="slot-label">${label}</div>
    <div class="slot-val" style="color:${d ? '#' + d.tc : 'var(--t3)'}">${name ? name.split(' ').pop() : '—'}</div>
    ${d ? `<div style="font-size:9px;color:var(--t3);margin-top:1px">${d.team}</div>` : ''}
  </div>`;
    }

    function makeTeamSlot(label, tname) {
      const tDrivers = tname ? DRIVERS_2026.filter(d => d.team === tname) : [];
      const tc = tDrivers[0]?.tc || '555';
      return `<div class="myteam-slot${tname ? ' filled' : ''}">
    <div class="slot-label">${label}</div>
    <div class="slot-val" style="color:${tname ? '#' + tc : 'var(--t3)'};font-size:11px">${tname || '—'}</div>
    ${tname ? `<div style="font-size:9px;color:var(--t3);margin-top:1px">${tDrivers.map(d => d.abbr).join(' · ')}</div>` : ''}
  </div>`;
    }


    function getBudgetUsed() {
      let t = 0;
      [fantState.driver1, fantState.driver2, fantState.driver3].forEach(n => {
        if (n) { const d = DRIVERS_2026.find(x => x.name === n); if (d) t += d.price; }
      });
      [fantState.team1, fantState.team2].forEach(tn => {
        if (tn) t += (TEAM_PRICES_2026[tn] || 0);
      });
      return t;
    }

    function selectDriver(name) {
      if (fantState.driver1 === name) fantState.driver1 = null;
      else if (fantState.driver2 === name) fantState.driver2 = null;
      else if (fantState.driver3 === name) fantState.driver3 = null;
      else if (!fantState.driver1) fantState.driver1 = name;
      else if (!fantState.driver2) fantState.driver2 = name;
      else if (!fantState.driver3) fantState.driver3 = name;
      else { showToast('❌ Hai già 3 piloti. Deselezionane uno.', 'err'); return; }
      const used = getBudgetUsed();
      if (used > BUDGET_TOTAL) showToast('⚠️ Budget superato di ' + (used - BUDGET_TOTAL) + ' cr!', 'err');
      const next = getNextRace();
      if (next) renderFantasyUI(next, new Set(), new Set(), fantState.locked);
    }



    async function saveFantasyTeam(raceId) {
      if (!fantState.driver1 || !fantState.driver2 || !fantState.driver3) { showToast('❌ Seleziona 3 piloti', 'err'); return; }
      const drivers = [fantState.driver1, fantState.driver2, fantState.driver3];
      if (new Set(drivers).size < 3) { showToast('❌ Piloti duplicati!', 'err'); return; }
      if (!fantState.team1 || !fantState.team2) { showToast('❌ Seleziona 2 scuderie', 'err'); return; }
      if (fantState.team1 === fantState.team2) { showToast('❌ Stessa scuderia due volte!', 'err'); return; }
      const used = getBudgetUsed();
      if (used > BUDGET_TOTAL) { showToast('❌ Budget superato di ' + (used - BUDGET_TOTAL) + ' cr!', 'err'); return; }

      const payload = {
        user_id: currentUser.id, race_id: raceId,
        driver1: fantState.driver1, driver2: fantState.driver2, driver3: fantState.driver3,
        team1: fantState.team1, team2: fantState.team2,
        budget_used: used,
        saved_at: new Date().toISOString()
      };
      const { error } = await sb.from('fantasy_teams').upsert(payload, { onConflict: 'user_id,race_id' });
      if (error) { showToast('❌ ' + error.message, 'err'); return; }
      invalidateCache('allteams_' + next.id); invalidateCache('stand_teams'); invalidateCache('lastteams_' + next.id);
      showToast('✅ Team salvato! ' + used + '/' + BUDGET_TOTAL + ' cr', 'ok');
      renderFantasy();
    }

    // ══════════════════ PRONOSTICI AVANZATI ══════════════════

    async function renderPredict() {
      const next = getNextRace();
      const el = document.getElementById('predict-content');
      if (!next) { el.innerHTML = '<div class="status-banner sb-info">Nessun GP disponibile.</div>'; return; }
      if (!el.innerHTML.trim()) {
        el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--t3)"><div style="font-size:24px;margin-bottom:8px">⟳</div><div style="font-size:12px;letter-spacing:1px">Caricamento pronostici...</div></div>';
      }
      // 🔒 Pronostici si bloccano all'inizio delle QUALIFICHE (Q1), non della gara
      const qualLockTime = new Date(next.sessions.qual);
      const isLocked = qualLockTime <= new Date();
      const allMyPreds = await cachedQuery('mypreds_' + currentUser.id, async () => {
        const { data } = await sb.from('predictions').select('*').eq('user_id', currentUser.id);
        return data;
      }, 15000);
      const ex = (allMyPreds || []).find(p => p.race_id === next.id) || null;
      _sc_count = ex?.sc_count ?? 0;
      _first_dnf = ex?.first_dnf || '';
      _team_double = ex?.team_double || '';
      _sc_yn = ex?.sc_yn ?? null;
      _rf_yn = ex?.rf_yn ?? null;
      _retires_count = ex?.retires ?? 0;

      const dOpt = (id, val, placeholder = '— Seleziona —') => `<select class="fi fi-sel" id="${id}">
    <option value="">${placeholder}</option>
    ${DRIVERS_2026.map(d => `<option value="${d.name}"${val === d.name ? ' selected' : ''}>#${d.num} ${d.name} (${d.team})</option>`).join('')}
  </select>`;

      const teamOpt = (id, val) => `<select class="fi fi-sel" id="${id}">
    <option value="">— Seleziona Team —</option>
    ${TEAMS_2026.map(t => `<option value="${t}"${val === t ? ' selected' : ''}>${t}</option>`).join('')}
  </select>`;

      el.innerHTML = `
    <div style="font-family:'Exo 2',sans-serif;font-weight:900;font-size:18px;text-transform:uppercase;margin-bottom:10px">
      ${next.flag} R${next.round} · ${next.name}${next.sprint ? ' 🟣 Sprint' : ''}
    </div>
    ${isLocked ? '<div class="lock-stripe">🔒 Qualifiche iniziate — pronostici chiusi per questo GP</div>' : ''}
    ${ex && !isLocked ? '<div class="status-banner sb-ok">✅ Pronostico salvato — puoi aggiornarlo fino all\'inizio delle qualifiche</div>' : ex && isLocked ? '<div class="status-banner sb-ok">✅ Pronostico salvato (bloccato)</div>' : ''}
    <div class="perfect-badge">🎯 Perfect Weekend (pole+podio+SC corretti) → <strong>+${PRED.perfect} pts</strong> · Super Perfect (+ ritiri) → <strong>+${PRED.super_perfect} pts</strong></div>

    <!-- QUALIFICA -->
    <div class="psec">
      <div class="psectit">🏁 Qualifica</div>
      <div class="prow">
        <div class="plabel">🥇 Pole Position <span style="color:var(--green)">+${PRED.pole_exact} pts</span> <span style="color:var(--yellow)">+${PRED_CR.pole_correct} cr</span></div>
        ${dOpt('ppole', ex?.pole)}
      </div>
      <div class="prow">
        <div class="plabel">🏎️ Prima fila completa · entrambi corretti <span style="color:var(--green)">+8</span> · uno corretto <span style="color:var(--yellow)">+3</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          ${dOpt('pfila1', ex?.fila1 || '', 'P1 griglia')}
          ${dOpt('pfila2', ex?.fila2 || '', 'P2 griglia')}
        </div>
      </div>
    </div>

    <!-- PODIO -->
    <div class="psec">
      <div class="psectit">🏆 Podio Gara</div>
      <div class="prow">
        <div class="plabel">🥇 Vincitore <span style="color:var(--green)">+${PRED.win_exact} pts</span> esatto · <span style="color:var(--yellow)">+${PRED.win_podium} pts</span> sul podio · <span style="color:var(--yellow)">+${PRED_CR.win_exact} cr</span> se esatto</div>
        ${dOpt('pp1', ex?.p1)}
      </div>
      <div class="prow">
        <div class="plabel">🥈 Secondo <span style="color:var(--green)">+${PRED.pos_exact} pts</span> esatto · <span style="color:var(--yellow)">+${PRED.pos_in_podium} pts</span> nel podio · <span style="color:var(--yellow)">+${PRED_CR.podium_exact} cr</span> esatto</div>
        ${dOpt('pp2', ex?.p2)}
      </div>
      <div class="prow">
        <div class="plabel">🥉 Terzo <span style="color:var(--green)">+${PRED.pos_exact} pts</span> esatto · <span style="color:var(--yellow)">+${PRED.pos_in_podium} pts</span> nel podio · <span style="color:var(--yellow)">+${PRED_CR.podium_exact} cr</span> esatto</div>
        ${dOpt('pp3', ex?.p3)}
      </div>
    </div>

    <!-- 4° e 5° -->
    <div class="psec">
      <div class="psectit">🎯 Top 10 (pos 4–10)</div>
      <div class="prow">
        <div class="plabel" style="margin-bottom:8px">Ogni pilota corretto nella top10 (pos 4-10) <span style="color:var(--green)">+${PRED.top10_correct} pts</span> · <span style="color:var(--yellow)">+${PRED_CR.top10_correct} cr</span> — massimo 7 piloti</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">
          <div><div style="font-size:9px;color:var(--t3);margin-bottom:3px">4° posto</div>${dOpt('pp4', ex?.p4)}</div>
          <div><div style="font-size:9px;color:var(--t3);margin-bottom:3px">5° posto</div>${dOpt('pp5', ex?.p5)}</div>
          ${[6, 7, 8, 9, 10].map(pos => `<div>
            <div style="font-size:9px;color:var(--t3);margin-bottom:3px;">${pos}° posto</div>
            ${dOpt('ptop' + pos, ex?.['top' + pos] || '')}
          </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- GIRO VELOCE -->
    <div class="psec">
      <div class="psectit">⚡ Giro Veloce</div>
      <div class="prow">
        <div class="plabel">Pilota con il giro più veloce in gara <span style="color:var(--green)">+${PRED.fastest} pts</span> · <span style="color:var(--yellow)">+${PRED_CR.fastest_lap} cr</span></div>
        ${dOpt('pfastlap', ex?.fastest_lap || '')}
      </div>
    </div>

    <!-- FASTEST PIT STOP -->
    <div class="psec">
      <div class="psectit">⚙️ Prima Scuderia al Pit Stop</div>
      <div class="prow">
        <div class="plabel">Prima scuderia ad effettuare il pit stop in gara <span style="color:var(--green)">+${PRED.fastest_pit} pts</span> · <span style="color:var(--yellow)">+${PRED_CR.fastest_pit} cr</span></div>
        ${teamOpt('pfastpit', ex?.fastest_pit_team || '')}
      </div>
    </div>

    <!-- MIGLIOR RIMONTA -->
    <div class="psec">
      <div class="psectit">🔄 Pilota che Guadagna più Posizioni</div>
      <div class="prow">
        <div class="plabel">Pilota con più posizioni guadagnate rispetto alla partenza <span style="color:var(--green)">+${PRED.best_comeback} pts</span> · <span style="color:var(--yellow)">+${PRED_CR.best_comeback} cr</span></div>
        ${dOpt('pcomeback', ex?.best_comeback || '')}
      </div>
    </div>

    <!-- SAFETY CAR & RED FLAG -->
    <div class="psec">
      <div class="psectit">🚩 Safety Car / Bandiera Rossa</div>
      <div class="prow">
        <div class="plabel">Safety Car in gara? <span style="color:var(--green)">+${PRED.sc_exact} pts · +${PRED_CR.sc_correct} cr</span> risposta corretta</div>
        <div class="tog" id="tog-sc">
          <div class="tb ${(ex?.sc_yn === true) ? 'on yes' : ''}" onclick="togYN('sc',true)">✅ Sì</div>
          <div class="tb ${(ex?.sc_yn === false) ? 'on' : ''}" onclick="togYN('sc',false)">❌ No</div>
        </div>
      </div>
      <div class="prow">
        <div class="plabel">Bandiera Rossa in gara? <span style="color:var(--green)">+${PRED.rf_exact} pts · +${PRED_CR.rf_correct} cr</span> risposta corretta</div>
        <div class="tog" id="tog-rf">
          <div class="tb ${(ex?.rf_yn === true) ? 'on yes' : ''}" onclick="togYN('rf',true)">✅ Sì</div>
          <div class="tb ${(ex?.rf_yn === false) ? 'on' : ''}" onclick="togYN('rf',false)">❌ No</div>
        </div>
      </div>
    </div>

    <!-- RITIRI -->
    <div class="psec">
      <div class="psectit">💥 Totale Ritiri in Gara</div>
      <div class="prow">
        <div class="plabel">Numero totale ritiri <span style="color:var(--green)">+${PRED.retires_exact} pts · +${PRED_CR.retires_exact} cr</span> esatto · <span style="color:var(--yellow)">+${PRED.retires_close} pts · +${PRED_CR.retires_close} cr</span> ±1</div>
        <div class="numinput" style="margin-bottom:8px">
          <button class="nb" onclick="chRetires(-1)">−</button>
          <div class="nv" id="ret-v">${ex?.retires ?? 0}</div>
          <button class="nb" onclick="chRetires(1)">+</button>
        </div>
      </div>
    </div>

    <!-- PRIMO DNF -->
    <div class="psec">
      <div class="psectit">🚫 Primo Pilota Ritirato</div>
      <div class="prow">
        <div class="plabel">Primo pilota a ritirarsi dalla gara <span style="color:var(--green)">+${PRED.first_dnf || 5} pts</span></div>
        ${dOpt('pfirstdnf', ex?.first_dnf || '')}
      </div>
    </div>

    <!-- GRIGLIA / BEST WEEKEND -->
    <div class="psec">
      <div class="psectit">📊 Miglior Risultato Weekend</div>
      <div class="prow">
        <div class="plabel">Pilota con miglior risultato combinato (qualifica + ${next.sprint ? 'sprint + ' : ' '}gara) <span style="color:var(--green)">+${PRED.grid_best_weekend}</span></div>
        ${dOpt('pgrid', ex?.grid_best || '')}
      </div>
    </div>

    <!-- COSTRUTTORE PERFORMANTE -->
    <div class="psec">
      <div class="psectit">🏎️ Costruttore con più Punti nel Weekend</div>
      <div class="prow">
        <div class="plabel">Costruttore con punteggio più alto nel weekend <span style="color:var(--green)">+${PRED.constructor_perf} pts</span> · <span style="color:var(--yellow)">+${PRED_CR.constructor_perf} cr</span></div>
        ${teamOpt('pconstructor', ex?.constructor_best || '')}
      </div>
    </div>


    ${next.sprint ? `
    <!-- SPRINT -->
    <div class="psec">
      <div class="psectit">🟣 Sprint Race</div>
      <div class="prow">
        <div class="plabel">Vincitore Sprint <span style="color:var(--green)">+${PRED.sprint_exact}</span></div>
        ${dOpt('pspr', ex?.sprint_win)}
      </div>
      <div class="prow">
        <div class="plabel">Podio Sprint completo (tutti e 3) <span style="color:var(--green)">+${PRED.sprint_top3_exact}</span> · Pilota nel podio sbagliata pos. <span style="color:var(--yellow)">+${PRED.sprint_in_top3}</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">
          ${dOpt('pspr2', ex?.sprint_p2 || '', 'Sprint P2')}
          ${dOpt('pspr3', ex?.sprint_p3 || '', 'Sprint P3')}
        </div>
      </div>
    </div>`: ''}

    ${!isLocked ? `
    <div class="subbar">
      <button class="btn btn-r btn-w" onclick="savePred('${next.id}')" style="font-size:16px;padding:14px">
        ${ex ? '✏️ Aggiorna Pronostico' : '💾 Salva Pronostico'}
      </button>
    </div>`: ''}
  `;

      // Se il pronostico è lockato, disabilita tutti gli input/select per impedire modifiche
      if (isLocked) {
        const predEl = document.getElementById('predict-content');
        if (predEl) {
          predEl.querySelectorAll('select, input, button.tb').forEach(el => {
            el.disabled = true;
            el.style.opacity = '0.5';
            el.style.cursor = 'not-allowed';
            el.style.pointerEvents = 'none';
          });
          // Overlay message
          predEl.querySelectorAll('.prow').forEach(row => {
            row.style.pointerEvents = 'none';
          });
        }
      }
    }

    let _retires_count = 0;
    let _sc_yn = null;   // true=sì, false=no
    let _rf_yn = null;   // true=sì, false=no

    function togYN(type, val) {
      if (type === 'sc') _sc_yn = val;
      if (type === 'rf') _rf_yn = val;
      // Update UI
      const tog = document.getElementById('tog-' + type);
      if (!tog) return;
      const btns = tog.querySelectorAll('.tb');
      btns[0].className = 'tb' + (val === true ? ' on yes' : '');
      btns[1].className = 'tb' + (val === false ? ' on' : '');
    }

    function chRetires(d) { _retires_count = Math.max(0, Math.min(20, _retires_count + d)); document.getElementById('ret-v').textContent = _retires_count; }

    async function savePred(raceId) {
      const race = CALENDAR_2026.find(r => r.id === raceId);
      if (new Date(race?.sessions.qual) <= new Date()) { showToast('❌ Qualifiche iniziate — pronostici chiusi!', 'err'); return; }
      const p1 = document.getElementById('pp1').value;
      const p2 = document.getElementById('pp2').value;
      const p3 = document.getElementById('pp3').value;
      if (!p1 || !p2 || !p3) { showToast('❌ Completa almeno il podio', 'err'); return; }
      if (p1 === p2 || p1 === p3 || p2 === p3) { showToast('❌ Stesso pilota nel podio!', 'err'); return; }
      const payload = {
        user_id: currentUser.id, race_id: raceId,
        pole: document.getElementById('ppole').value || null,
        fila1: document.getElementById('pfila1')?.value || null,
        fila2: document.getElementById('pfila2')?.value || null,
        p1, p2, p3,
        p4: document.getElementById('pp4').value || null,
        p5: document.getElementById('pp5').value || null,
        top6: document.getElementById('ptop6')?.value || null,
        top7: document.getElementById('ptop7')?.value || null,
        top8: document.getElementById('ptop8')?.value || null,
        top9: document.getElementById('ptop9')?.value || null,
        top10: document.getElementById('ptop10')?.value || null,
        fastest_pit_team: document.getElementById('pfastpit')?.value || null,
        best_comeback: document.getElementById('pcomeback')?.value || null,
        fastest_lap: document.getElementById('pfastlap')?.value || null,
        grid_best: document.getElementById('pgrid')?.value || null,
        constructor_best: document.getElementById('pconstructor')?.value || null,
        sc_yn: _sc_yn,
        rf_yn: _rf_yn,
        sprint_win: document.getElementById('pspr')?.value || null,
        sprint_p2: document.getElementById('pspr2')?.value || null,
        sprint_p3: document.getElementById('pspr3')?.value || null,
        retires: _retires_count,
        first_dnf: document.getElementById('pfirstdnf')?.value || null,
        saved_at: new Date().toISOString()
      };
      // Feedback visivo durante salvataggio
      const saveBtn = document.querySelector('.subbar button') || document.querySelector('button[onclick*="savePred"]');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '⟳ Salvataggio...'; }

      const { data: saved, error } = await sb.from('predictions')
        .upsert(payload, { onConflict: 'user_id,race_id' })
        .select();

      if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = (saved && saved.length > 0) ? '✅ Salvato!' : '💾 Salva Pronostico'; setTimeout(() => { if (saveBtn) saveBtn.innerHTML = '💾 Salva Pronostico'; }, 2000); }

      if (error) {
        console.error('[savePred] errore:', error);
        // Mostra errore espanso nell'UI
        const errBanner = document.createElement('div');
        errBanner.className = 'status-banner sb-warn';
        errBanner.innerHTML = `⚠️ Errore salvataggio pronostico:<br><strong>${error.message}</strong><br><small>Codice: ${error.code || '?'} · Hint: ${error.hint || '—'}</small>`;
        document.getElementById('predict-content').prepend(errBanner);
        setTimeout(() => errBanner.remove(), 10000);
        showToast('❌ ' + error.message, 'err');
        return;
      }
      if (!saved || saved.length === 0) {
        showToast('⚠️ DB non ha confermato il salvataggio — riprova', 'err');
        console.warn('[savePred] upsert non ha restituito dati:', saved);
        return;
      }
      console.log('[savePred] salvato con successo:', saved[0]);
      invalidateCache('mypreds_' + currentUser.id); invalidateCache('stand_preds');
      showToast('✅ Pronostico salvato!', 'ok');
      renderPredict();
    }

