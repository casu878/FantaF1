// ══════════════════ ASTA LIVE ══════════════════

    const AUCTION_BUDGET = 300;

    async function openAuctionPanel(c) {
      const { data: astate } = await sb.from('auction_state').select('*').maybeSingle();
      const { data: users } = await sb.from('profiles').select('*').order('nickname');
      const { data: lots } = await sb.from('auction_lots').select('*').order('created_at', { ascending: false });
      const nextRace = getNextRace();
      const { data: allTeams } = nextRace ? await sb.from('fantasy_teams').select('user_id,driver1,driver2,team1').eq('race_id', nextRace.id) : { data: [] };
      const teamByUser = {};
      (allTeams || []).forEach(t => { teamByUser[t.user_id] = t; });
      const isAdmin = currentProfile?.role === 'admin';
      const marketOpen = astate?.market_open || false;
      const activeLotId = astate?.active_lot || null;
      const currentLot = activeLotId ? (lots || []).find(l => l.id === activeLotId) : null;

      // Budget per utente
      const userBudgets = {};
      (users || []).forEach(u => {
        const won = (lots || []).filter(l => l.winner_id === u.id && l.status === 'sold');
        const spent = won.reduce((s, l) => s + (l.final_price || 0), 0);
        userBudgets[u.id] = {
          nickname: u.nickname, avatar: u.avatar, color: u.color,
          spent, remaining: AUCTION_BUDGET - spent,
          drivers: won.filter(l => l.item_type === 'driver').map(l => l.item_name),
          teams: won.filter(l => l.item_type === 'team').map(l => l.item_name),
        };
      });

      let html = '';
      html += '<span class="mclose" onclick="closeMod()">&#10005;</span>';
      html += '<div class="mtitle">&#x1F528; Asta Live Fanta F1</div>';

      // ── Stato mercato ──
      html += '<div class="auction-status-bar">';
      html += '<div style="font-size:10px;letter-spacing:3px;color:var(--t3);text-transform:uppercase;margin-bottom:4px">Mercato</div>';
      html += '<div style="font-family:\'Exo 2\',sans-serif;font-weight:900;font-size:20px;margin-bottom:8px;color:' + (marketOpen ? 'var(--green)' : '#ff7070') + '">' + (marketOpen ? '&#128994; APERTO' : '&#128308; CHIUSO') + '</div>';
      if (isAdmin) {
        html += '<div style="display:flex;gap:7px;justify-content:center;flex-wrap:wrap">';
        html += '<button class="btn ' + (marketOpen ? 'btn-no' : 'btn-ok') + ' btn-sm" onclick="toggleMarket(' + (marketOpen ? 'false' : 'true') + ')">' + (marketOpen ? '&#128308; Chiudi Mercato' : '&#128994; Apri Mercato') + '</button>';
        html += '<button class="btn btn-g btn-sm" onclick="openMod(\'auction\')">&#8635; Aggiorna</button>';
        html += '<button class="btn btn-no btn-sm" onclick="resetAllAuction()" style="border-color:#ff4444">&#x1F5D1; Reset Asta Completo</button>';
        html += '</div>';
      } else {
        html += '<div style="font-size:11px;color:var(--t3)">Solo l\'admin gestisce l\'asta</div>';
      }
      html += '</div>';

      // ── Lotto attivo ──
      if (currentLot) {
        const drv = DRIVERS_2026.find(d => d.name === currentLot.item_name);
        const lotColor = currentLot.item_type === 'driver' ? (drv?.tc || 'E10600') : '3671C6';
        const currentBidder = (users || []).find(u => u.id === currentLot.current_bidder);
        const currentBid = currentLot.current_bid || currentLot.base_price;

        html += '<div style="background:linear-gradient(135deg,#1a1200,var(--s1));border:2px solid var(--gold);border-radius:14px;padding:16px;margin-bottom:10px">';
        html += '<div style="font-size:10px;letter-spacing:3px;color:var(--gold);text-transform:uppercase;margin-bottom:6px">&#x1F528; Lotto in corso</div>';
        html += '<div class="bid-stripe" style="background:#' + lotColor + '"></div>';
        html += '<div style="font-family:\'Exo 2\',sans-serif;font-weight:900;font-size:22px;margin-bottom:4px">' + currentLot.item_name + '</div>';
        html += '<div style="font-size:11px;color:var(--t3);margin-bottom:10px">' + (currentLot.item_type === 'driver' ? 'Pilota' : 'Scuderia') + ' &middot; Base: ' + currentLot.base_price + ' cr';
        if (currentLot.item_type === 'driver') {
          const drv2 = DRIVERS_2026.find(d => d.name === currentLot.item_name);
          if (drv2) html += ' &middot; <span style="color:#ff9090">Stipendio: ' + drv2.salary + 'cr/gara</span>';
        } else {
          html += ' &middot; <span style="color:#ff9090">Stipendio: ' + (TEAM_SALARIES_2026[currentLot.item_name] || 0) + 'cr/gara</span>';
        }
        html += '</div>';
        html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">';
        html += '<div><div style="font-size:10px;color:var(--t3)">Offerta attuale</div>';
        html += '<div class="auction-credits">' + currentBid + ' <span style="font-size:14px;color:var(--t3)">cr</span></div>';
        if (currentBidder) html += '<div style="font-size:11px;color:var(--yellow);margin-top:2px">&#128100; ' + currentBidder.nickname + '</div>';
        html += '</div>';
        if (isAdmin) {
          html += '<div style="display:flex;flex-direction:column;gap:5px">';
          html += '<button class="btn btn-ok btn-sm" onclick="closeLot(\'' + currentLot.id + '\',\'sold\')">&#10003; Aggiudica</button>';
          html += '<button class="btn btn-no btn-sm" onclick="closeLot(\'' + currentLot.id + '\',\'unsold\')">&#10005; Non venduto</button>';
          html += '</div>';
        }
        html += '</div>';

        if (isAdmin) {
          html += '<div style="font-size:10px;color:var(--t3);margin-bottom:6px;letter-spacing:1px;text-transform:uppercase">Registra offerta per:</div>';
          html += '<div style="display:flex;flex-direction:column;gap:5px;max-height:200px;overflow-y:auto">';
          (users || []).forEach(u => {
            const ub = userBudgets[u.id];
            const minBid = currentBid + 1;
            html += '<div style="display:flex;align-items:center;gap:8px;padding:7px;background:var(--s2);border-radius:8px">';
            html += '<div class="av" style="background:' + u.color + ';width:26px;height:26px;font-size:11px;flex-shrink:0">' + u.avatar + '</div>';
            html += '<div style="flex:1;font-size:12px;font-weight:700">' + u.nickname + '</div>';
            html += '<div style="font-size:10px;color:var(--t3);margin-right:4px">' + ub.remaining + 'cr</div>';
            html += '<input type="number" id="bid_' + u.id + '" class="fi" style="width:65px;padding:6px;font-size:13px" placeholder="' + minBid + '" min="' + minBid + '" max="' + ub.remaining + '">';
            html += '<button class="btn btn-g btn-sm" onclick="placeBid(\'' + currentLot.id + '\',\'' + u.id + '\',\'bid_' + u.id + '\')">Offri</button>';
            html += '</div>';
          });
          html += '</div>';
        } else {
          // Utente normale: può proporre la sua offerta (l'admin la conferma)
          const myBudget = userBudgets[currentUser.id];
          const minBid = currentBid + 1;
          html += '<div style="background:var(--s2);border-radius:10px;padding:12px;margin-top:6px">';
          html += '<div style="font-size:10px;color:var(--t3);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">&#x1F4B0; La Mia Offerta</div>';
          html += '<div style="font-size:11px;color:var(--yellow);margin-bottom:8px">Budget rimasto: ' + myBudget?.remaining + ' cr</div>';
          html += '<div style="display:flex;gap:8px;align-items:center">';
          html += '<input type="number" id="my_bid_input" class="fi" style="flex:1;padding:9px;font-size:15px;font-weight:900" placeholder="' + minBid + '" min="' + minBid + '" max="' + (myBudget?.remaining || 0) + '">';
          html += '<button class="btn btn-r" onclick="submitMyBid(\'' + currentLot.id + '\')">&#x1F4E3; Proponi Offerta</button>';
          html += '</div>';
          html += '<div style="font-size:10px;color:var(--t3);margin-top:6px">⚠️ Solo l\'admin conferma l\'offerta — alzate la mano e dichiarate il valore!</div>';
          html += '</div>';
        }
        html += '</div>';
      } else {
        html += '<div style="background:var(--s2);border-radius:10px;padding:12px;text-align:center;color:var(--t3);font-size:12px;margin-bottom:10px">Nessun lotto attivo al momento</div>';
      }

      // ── Nuovo lotto (admin) ──
      if (isAdmin) {
        html += '<div style="background:var(--s1);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px">';
        html += '<div style="font-family:\'Exo 2\',sans-serif;font-weight:900;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:var(--red);margin-bottom:10px">+ Nuovo Lotto</div>';
        html += '<div class="fg"><label>Tipo</label><select class="fi fi-sel" id="lot-type" onchange="updateLotItems()">';
        html += '<option value="driver">Pilota</option><option value="team">Scuderia</option>';
        html += '</select></div>';
        html += '<div class="fg"><label>Elemento</label><select class="fi fi-sel" id="lot-item">';
        DRIVERS_2026.forEach(d => { html += '<option value="' + d.name + '">' + d.name + ' (' + d.team + ') &mdash; Val:' + d.price + 'cr Stip:' + d.salary + 'cr</option>'; });
        html += '</select></div>';
        html += '<div class="fg"><label>Prezzo base (cr)</label><input class="fi" type="number" id="lot-base" value="1" min="1" max="50"></div>';
        html += '<button class="btn btn-r btn-w" onclick="createLot()">&#x1F528; Avvia Lotto</button>';
        html += '</div>';
      }

      // ── Budget utenti ──
      html += '<div style="font-family:\'Exo 2\',sans-serif;font-weight:900;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:8px">&#x1F4B0; Budget Giocatori</div>';
      (users || []).forEach(u => {
        const ub = userBudgets[u.id];
        if (!ub) return;
        const ut = teamByUser[u.id];
        html += '<div class="user-budget-row" style="flex-direction:column;align-items:stretch;gap:6px">';
        html += '<div style="display:flex;align-items:center;gap:8px">';
        html += '<div class="av" style="background:' + ub.color + ';width:28px;height:28px;font-size:12px;flex-shrink:0">' + ub.avatar + '</div>';
        html += '<div style="flex:1;font-weight:700;font-size:13px">' + ub.nickname + '</div>';
        html += '<div style="text-align:right">';
        // Calculate salary total for this user
        const totalSalary = ub.drivers.reduce((s, dName) => { const drv = DRIVERS_2026.find(d => d.name === dName); return s + (drv?.salary || 0); }, 0)
          + (ub.teams.length ? (TEAM_SALARIES_2026[ub.teams[0]] || 0) : 0);
        html += '<div class="auction-credits" style="font-size:18px">' + ub.remaining + ' <span style="font-size:10px;color:var(--t3)">cr</span></div>';
        if (totalSalary > 0) html += '<div style="font-size:10px;color:#ff9090">💸 ' + totalSalary + 'cr/gara</div>';
        html += '</div></div>';
        // team corrente
        const d1n = ut?.driver1 ? ut.driver1.split(' ').pop() : '—';
        const d2n = ut?.driver2 ? ut.driver2.split(' ').pop() : '—';
        const t1n = ut?.team1 || '—';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px">';
        html += '<div style="background:var(--s1);border-radius:6px;padding:5px 7px;text-align:center;border:1px solid var(--border)">';
        html += '<div style="font-size:8px;color:var(--t3)">P1</div>';
        html += '<div style="font-size:11px;font-weight:800;color:var(--t1)">' + d1n + '</div></div>';
        html += '<div style="background:var(--s1);border-radius:6px;padding:5px 7px;text-align:center;border:1px solid var(--border)">';
        html += '<div style="font-size:8px;color:var(--t3)">P2</div>';
        html += '<div style="font-size:11px;font-weight:800;color:var(--t1)">' + d2n + '</div></div>';
        html += '<div style="background:var(--s1);border-radius:6px;padding:5px 7px;text-align:center;border:1px solid var(--border)">';
        html += '<div style="font-size:8px;color:var(--t3)">SCU</div>';
        html += '<div style="font-size:10px;font-weight:800;color:var(--t1)">' + t1n + '</div></div>';
        html += '</div>';
        html += '</div>';
      });

      // ── Storico ──
      const sold = (lots || []).filter(l => l.status === 'sold' || l.status === 'unsold').slice(0, 15);
      if (sold.length) {
        html += '<div style="font-family:\'Exo 2\',sans-serif;font-weight:900;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin:12px 0 8px">&#x1F4CB; Storico</div>';
        sold.forEach(l => {
          const winner = l.winner_id ? (users || []).find(u => u.id === l.winner_id) : null;
          html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--s2);border-radius:8px;margin-bottom:4px;border-left:3px solid ' + (l.status === 'sold' ? 'var(--green)' : 'var(--t3)') + '">';
          html += '<div style="flex:1;font-size:12px;font-weight:700">' + l.item_name + '</div>';
          if (l.status === 'sold') {
            html += '<div style="font-size:11px;color:var(--yellow)">' + l.final_price + ' cr</div>';
            html += '<div style="font-size:11px;color:var(--green)">&rarr; ' + (winner ? winner.nickname : '?') + '</div>';
          } else {
            html += '<div style="font-size:11px;color:var(--t3)">Non venduto</div>';
          }
          html += '</div>';
        });
      }

      c.innerHTML = html;
    }

    function updateLotItems() {
      const type = document.getElementById('lot-type')?.value;
      const sel = document.getElementById('lot-item');
      if (!sel) return;
      sel.innerHTML = '';
      if (type === 'driver') {
        DRIVERS_2026.forEach(d => { const o = document.createElement('option'); o.value = d.name; o.textContent = d.name + ' (' + d.team + ') — Val:' + d.price + 'cr Stip:' + d.salary + 'cr'; sel.appendChild(o); });
      } else {
        TEAMS_2026.forEach(t => { const o = document.createElement('option'); o.value = t; o.textContent = t + ' — Val:' + (TEAM_PRICES_2026[t] || 10) + 'cr Stip:' + (TEAM_SALARIES_2026[t] || 0) + 'cr'; sel.appendChild(o); });
      }
    }

    async function toggleMarket(open) {
      const boolOpen = open === true || open === 'true';
      await sb.from('auction_state').upsert({ id: 1, market_open: boolOpen, updated_at: new Date().toISOString() }, { onConflict: 'id' });
      await sb.from('admin_log').insert({ action: 'Mercato ' + (boolOpen ? 'aperto' : 'chiuso'), by_user: currentProfile?.nickname || 'admin' });
      showToast(boolOpen ? '&#128994; Mercato aperto!' : '&#128308; Mercato chiuso!', 'ok');
      openMod('auction');
    }

    async function createLot() {
      const type = document.getElementById('lot-type')?.value;
      const item = document.getElementById('lot-item')?.value;
      const base = parseInt(document.getElementById('lot-base')?.value) || 1;
      if (!item) { showToast('Seleziona un elemento', 'err'); return; }
      const { data: newLot, error } = await sb.from('auction_lots').insert({
        item_type: type, item_name: item, base_price: base, current_bid: base,
        current_bidder: null, status: 'active', created_at: new Date().toISOString()
      }).select().single();
      if (error) { showToast('Errore: ' + error.message, 'err'); return; }
      await sb.from('auction_state').upsert({ id: 1, active_lot: newLot.id, market_open: true, updated_at: new Date().toISOString() }, { onConflict: 'id' });
      await sb.from('admin_log').insert({ action: 'Lotto: ' + item + ' (base ' + base + 'cr)', by_user: currentProfile?.nickname || 'admin' });
      showToast('Lotto aperto: ' + item, 'gold');
      openMod('auction');
    }

    async function placeBid(lotId, userId, inputId) {
      const val = parseInt(document.getElementById(inputId)?.value);
      if (!val || val < 1) { showToast('Inserisci un\'offerta valida', 'err'); return; }
      const { data: lot } = await sb.from('auction_lots').select('*').eq('id', lotId).single();
      if (!lot || lot.status !== 'active') { showToast('Lotto non attivo', 'err'); return; }
      if (val <= (lot.current_bid || lot.base_price)) { showToast('Offerta troppo bassa (min ' + (lot.current_bid + 1) + 'cr)', 'err'); return; }
      const { data: uProf } = await sb.from('profiles').select('nickname').eq('id', userId).single();
      const uNick = uProf?.nickname || 'Utente';

      // ⛔ Controlla che pilota/scuderia sia svincolato (non già posseduto da altri)
      const { data: allSoldLots } = await sb.from('auction_lots').select('winner_id,item_name,item_type').eq('status', 'sold');
      const currentOwner = (allSoldLots || []).find(l =>
        l.item_name === lot.item_name && ['driver','team'].includes(l.item_type) && l.winner_id && l.winner_id !== userId
      );
      if (currentOwner) {
        const { data: releaseCheck } = await sb.from('auction_lots').select('id').eq('item_type','release_refund').ilike('item_name','%' + lot.item_name + '%').limit(1);
        if (!releaseCheck || releaseCheck.length === 0) {
          showToast('⛔ ' + lot.item_name + ' è già posseduto da un altro giocatore!', 'err'); return;
        }
      }

      // ⛔ Limite slot: max 2 piloti, max 1 scuderia per utente
      const nextRaceSlot = getNextRace();
      if (nextRaceSlot) {
        const { data: uTeam } = await sb.from('fantasy_teams').select('driver1,driver2,team1').eq('user_id', userId).eq('race_id', nextRaceSlot.id).maybeSingle();
        if (lot.item_type === 'driver') {
          const dc = [uTeam?.driver1, uTeam?.driver2].filter(Boolean).length;
          if (dc >= 2) { showToast('⛔ ' + uNick + ' ha già 2 piloti — offerta bloccata!', 'err'); return; }
        } else if (lot.item_type === 'team') {
          if (uTeam?.team1) { showToast('⛔ ' + uNick + ' ha già una scuderia — offerta bloccata!', 'err'); return; }
        }
      }

      // ⛔ Controllo crediti: offerta + stipendi totali devono essere sostenibili
      const { data: uLots } = await sb.from('auction_lots').select('final_price,item_type,item_name').eq('winner_id', userId).eq('status', 'sold');
      const { data: uPupsCheck } = await sb.from('powerup_purchases').select('cost').eq('user_id', userId);
      const _spentA = (uLots || []).filter(l => l.item_type !== 'economy_delta').reduce((s, l) => s + (l.final_price || 0), 0);
      const _spentE = (uLots || []).filter(l => l.item_type === 'economy_delta').reduce((s, l) => s + (l.final_price || 0), 0);
      const _spentP = (uPupsCheck || []).reduce((s, p) => s + (p.cost || 0), 0);
      const availCr = AUCTION_BUDGET - _spentA - _spentP - _spentE;
      if (val > availCr) { showToast('⛔ ' + uNick + ' non ha crediti sufficienti! (ha ' + availCr + 'cr, offre ' + val + 'cr)', 'err'); return; }
      const myDrvs = (uLots || []).filter(l => l.item_type === 'driver').map(l => l.item_name);
      const myTmN = (uLots || []).find(l => l.item_type === 'team')?.item_name || null;
      let totSal = myDrvs.reduce((s, n) => { const d = DRIVERS_2026.find(x => x.name === n); return s + (d?.salary || 0); }, 0);
      if (myTmN) totSal += (TEAM_SALARIES_2026[myTmN] || 0);
      const newSal = lot.item_type === 'driver' ? (DRIVERS_2026.find(d => d.name === lot.item_name)?.salary || 0) : (TEAM_SALARIES_2026[lot.item_name] || 0);
      totSal += newSal;
      if ((availCr - val) < totSal) {
        showToast('⚠️ ' + uNick + ': dopo l\'offerta avrà ' + (availCr - val) + 'cr ma gli stipendi totali sono ' + totSal + 'cr/gara — bloccato!', 'err'); return;
      }

      await sb.from('auction_lots').update({ current_bid: val, current_bidder: userId, updated_at: new Date().toISOString() }).eq('id', lotId);
      const { data: u } = await sb.from('profiles').select('nickname').eq('id', userId).single();
      await sb.from('admin_log').insert({ action: 'Offerta ' + val + 'cr su ' + lot.item_name + ' da ' + (u?.nickname || '?'), by_user: currentProfile?.nickname || 'admin' });
      showToast('Offerta ' + val + 'cr registrata!', 'ok');
      openMod('auction');
    }




    async function submitMyBid(lotId) {
      const val = parseInt(document.getElementById('my_bid_input')?.value);
      if (!val || val < 1) { showToast('Inserisci un\'offerta valida', 'err'); return; }
      const { data: lot } = await sb.from('auction_lots').select('*').eq('id', lotId).single();
      if (!lot || lot.status !== 'active') { showToast('Lotto non attivo', 'err'); return; }
      if (val <= (lot.current_bid || lot.base_price)) { showToast('Offerta troppo bassa (min ' + (lot.current_bid + 1) + 'cr)', 'err'); return; }

      // ⛔ Controlla che pilota/scuderia sia svincolato (non già posseduto da altri)
      const { data: allSoldMy } = await sb.from('auction_lots').select('winner_id,item_name,item_type').eq('status', 'sold');
      const ownerMy = (allSoldMy || []).find(l =>
        l.item_name === lot.item_name && ['driver','team'].includes(l.item_type) && l.winner_id && l.winner_id !== currentUser.id
      );
      if (ownerMy) {
        const { data: relCheck } = await sb.from('auction_lots').select('id').eq('item_type','release_refund').ilike('item_name','%' + lot.item_name + '%').limit(1);
        if (!relCheck || relCheck.length === 0) {
          showToast('⛔ ' + lot.item_name + ' è già posseduto da un altro giocatore!', 'err'); return;
        }
      }

      // ⛔ Limite slot: max 2 piloti, max 1 scuderia
      const nextRaceSlot2 = getNextRace();
      if (nextRaceSlot2) {
        const { data: mySlotTeam } = await sb.from('fantasy_teams').select('driver1,driver2,team1').eq('user_id', currentUser.id).eq('race_id', nextRaceSlot2.id).maybeSingle();
        if (lot.item_type === 'driver') {
          const dc = [mySlotTeam?.driver1, mySlotTeam?.driver2].filter(Boolean).length;
          if (dc >= 2) { showToast('⛔ Hai già 2 piloti — non puoi offrire!', 'err'); return; }
        } else if (lot.item_type === 'team') {
          if (mySlotTeam?.team1) { showToast('⛔ Hai già una scuderia — non puoi offrire!', 'err'); return; }
        }
      }

      // ⛔ Controllo crediti + stipendi
      const { data: myLotsC } = await sb.from('auction_lots').select('final_price,item_type,item_name').eq('winner_id', currentUser.id).eq('status', 'sold');
      const { data: myPupsC } = await sb.from('powerup_purchases').select('cost').eq('user_id', currentUser.id);
      const _mA = (myLotsC || []).filter(l => l.item_type !== 'economy_delta').reduce((s, l) => s + (l.final_price || 0), 0);
      const _mE = (myLotsC || []).filter(l => l.item_type === 'economy_delta').reduce((s, l) => s + (l.final_price || 0), 0);
      const _mP = (myPupsC || []).reduce((s, p) => s + (p.cost || 0), 0);
      const myAvailCr = AUCTION_BUDGET - _mA - _mP - _mE;
      if (val > myAvailCr) { showToast('⛔ Crediti insufficienti! (hai ' + myAvailCr + 'cr, offri ' + val + 'cr)', 'err'); return; }
      const _myD = (myLotsC || []).filter(l => l.item_type === 'driver').map(l => l.item_name);
      const _myT = (myLotsC || []).find(l => l.item_type === 'team')?.item_name || null;
      let _myS = _myD.reduce((s, n) => { const d = DRIVERS_2026.find(x => x.name === n); return s + (d?.salary || 0); }, 0);
      if (_myT) _myS += (TEAM_SALARIES_2026[_myT] || 0);
      const _nS = lot.item_type === 'driver' ? (DRIVERS_2026.find(d => d.name === lot.item_name)?.salary || 0) : (TEAM_SALARIES_2026[lot.item_name] || 0);
      _myS += _nS;
      if ((myAvailCr - val) < _myS) {
        showToast('⚠️ Dopo questa offerta avresti ' + (myAvailCr - val) + 'cr ma gli stipendi totali sono ' + _myS + 'cr/gara — bloccato!', 'err'); return;
      }

      await sb.from('auction_lots').update({ current_bid: val, current_bidder: currentUser.id, updated_at: new Date().toISOString() }).eq('id', lotId);
      await sb.from('admin_log').insert({ action: 'Proposta ' + val + 'cr su ' + lot.item_name + ' da ' + currentProfile?.nickname, by_user: currentProfile?.nickname || 'user' });
      showToast('Offerta ' + val + 'cr proposta — attendi conferma admin!', 'ok');
      openMod('auction');
    }
    async function resetAllAuction() {
      if (!confirm('⚠️ RESET COMPLETO: azzera tutti i lotti, team, power-up, crediti e bonus di tutti i giocatori. Continuare?')) return;
      // 1. Elimina tutti i lotti (crediti, economia, aste)
      await sb.from('auction_lots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      // 2. Reset stato asta
      await sb.from('auction_state').upsert({ id: 1, market_open: false, active_lot: null, updated_at: new Date().toISOString() }, { onConflict: 'id' });
      // 3. Svuota TUTTI i team di tutti gli utenti per TUTTI i GP
      await sb.from('fantasy_teams').update({ driver1: null, driver2: null, driver3: null, team1: null, saved_at: new Date().toISOString() }).neq('race_id', '____');
      // 4. Elimina tutti i power-up acquistati
      await sb.from('powerup_purchases').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      // 5. Reset punti tutti i profili
      const { data: allProfiles } = await sb.from('profiles').select('id');
      for (const p of (allProfiles || [])) {
        await sb.from('profiles').update({ total_pts: 0, gps_done: 0 }).eq('id', p.id);
      }
      // 6. Elimina gp_scores
      await sb.from('gp_scores').delete().neq('race_id', '____');
      invalidateCache();
      await sb.from('admin_log').insert({ action: 'RESET COMPLETO — team, crediti, piloti, scuderie, power-up e bonus azzerati per tutti', by_user: currentProfile?.nickname || 'admin' });
      showToast('✅ Reset completo! Crediti, piloti, scuderie e bonus azzerati.', 'ok');
      openMod('auction');
    }



    async function closeLot(lotId, outcome) {
      const { data: lot } = await sb.from('auction_lots').select('*').eq('id', lotId).single();
      if (!lot) return;

      const updates = {
        status: outcome,
        final_price: outcome === 'sold' ? lot.current_bid : null,
        winner_id: outcome === 'sold' ? lot.current_bidder : null,
        closed_at: new Date().toISOString()
      };
      await sb.from('auction_lots').update(updates).eq('id', lotId);
      await sb.from('auction_state').upsert({ id: 1, active_lot: null, updated_at: new Date().toISOString() }, { onConflict: 'id' });

      if (outcome === 'sold' && lot.current_bidder) {
        // ── Salva nel team dell'utente vincitore ──
        const winnerId = lot.current_bidder;

        // cerca il team più recente del vincitore oppure crea/aggiorna quello per il prossimo GP
        const nextRace = getNextRace();
        if (nextRace) {
          const { data: existing } = await sb.from('fantasy_teams').select('*').eq('user_id', winnerId).eq('race_id', nextRace.id).maybeSingle();

          let teamData = existing ? { ...existing } : { user_id: winnerId, race_id: nextRace.id, saved_at: new Date().toISOString() };

          if (lot.item_type === 'driver') {
            // Aggiunge il pilota nel primo slot libero
            if (!teamData.driver1 || teamData.driver1 === lot.item_name) teamData.driver1 = lot.item_name;
            else if (!teamData.driver2 || teamData.driver2 === lot.item_name) teamData.driver2 = lot.item_name;
            else teamData.driver1 = lot.item_name; // sostituisce driver1 se già pieni
          } else if (lot.item_type === 'team') {
            teamData.team1 = lot.item_name;
          }

          teamData.saved_at = new Date().toISOString();
          await sb.from('fantasy_teams').upsert(teamData, { onConflict: 'user_id,race_id' });
        }

        await sb.from('admin_log').insert({ action: 'Aggiudicato ' + lot.item_name + ' a ' + lot.current_bid + 'cr', by_user: currentProfile?.nickname || 'admin' });
        showToast(lot.item_name + ' aggiudicato!', 'gold');
      } else {
        await sb.from('admin_log').insert({ action: 'Non venduto: ' + lot.item_name, by_user: currentProfile?.nickname || 'admin' });
        showToast(lot.item_name + ' non venduto', 'err');
      }
      openMod('auction');
    }


    // ══════════════════ REALTIME ASTA ══════════════════

    function startAuctionRealtime() {
      if (_auctionChannel) return; // già attivo
      _auctionChannel = sb.channel('auction-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_lots' }, () => {
          const overlay = document.getElementById('moverlay');
          if (overlay && !overlay.classList.contains('hidden')) {
            const mc = document.getElementById('mcontent');
            if (mc && mc.querySelector('.mtitle')?.textContent?.includes('Asta')) {
              openAuctionPanel(mc);
            }
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_state' }, () => {
          const overlay = document.getElementById('moverlay');
          if (overlay && !overlay.classList.contains('hidden')) {
            const mc = document.getElementById('mcontent');
            if (mc && mc.querySelector('.mtitle')?.textContent?.includes('Asta')) {
              openAuctionPanel(mc);
            }
          }
        })
        .subscribe((status) => {
          // Fallback polling ogni 4s se il realtime non è disponibile
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (!_auctionPoll) _auctionPoll = setInterval(() => {
              const overlay = document.getElementById('moverlay');
              if (overlay && !overlay.classList.contains('hidden')) {
                const mc = document.getElementById('mcontent');
                if (mc && mc.querySelector('.mtitle')?.textContent?.includes('Asta')) {
                  openAuctionPanel(mc);
                }
              }
            }, 4000);
          }
        });
      // Avvia sempre polling ogni 4s come supplemento al realtime
      if (!_auctionPoll) _auctionPoll = setInterval(() => {
        const overlay = document.getElementById('moverlay');
        if (overlay && !overlay.classList.contains('hidden')) {
          const mc = document.getElementById('mcontent');
          if (mc && mc.querySelector('.mtitle')?.textContent?.includes('Asta')) {
            openAuctionPanel(mc);
          }
        }
      }, 4000);
    }

    let _auctionChannel = null;
    let _auctionPoll = null;

    function stopAuctionRealtime() {
      if (_auctionChannel) { sb.removeChannel(_auctionChannel); _auctionChannel = null; }
      if (_auctionPoll) { clearInterval(_auctionPoll); _auctionPoll = null; }
    }

    // ══════════════════ SVINCOLO & OFFERTE PRIVATE ══════════════════

    async function openReleasePanel() {
      const c = document.getElementById('mcontent');
      const { data: astate } = await sb.from('auction_state').select('market_open').maybeSingle();
      const marketOpen = astate?.market_open || false;
      const nextRace = getNextRace();
      if (!nextRace) { showToast('Nessuna gara in calendario', 'err'); return; }

      // Carica team corrente utente
      const { data: myTeam } = await sb.from('fantasy_teams').select('*')
        .eq('user_id', currentUser.id).eq('race_id', nextRace.id).maybeSingle();

      // Calcola crediti disponibili (da asta)
      const { data: lots } = await sb.from('auction_lots').select('final_price,winner_id').eq('status', 'sold');
      const { data: pups } = await sb.from('powerup_purchases').select('cost').eq('user_id', currentUser.id);
      const spentAuction = (lots || []).filter(l => l.winner_id === currentUser.id && l.item_type !== 'economy_delta').reduce((s, l) => s + (l.final_price || 0), 0);
      const spentEcoDelta = (lots || []).filter(l => l.winner_id === currentUser.id && l.item_type === 'economy_delta').reduce((s, l) => s + (l.final_price || 0), 0);
      const spentPU = (pups || []).reduce((s, p) => s + (p.cost || 0), 0);
      const myCredits = AUCTION_BUDGET - spentAuction - spentPU - spentEcoDelta;

      // Carica offerte private ricevute
      const { data: receivedOffers } = await sb.from('trade_offers')
        .select('*').eq('to_user_id', currentUser.id).eq('status', 'pending');
      const { data: sentOffers } = await sb.from('trade_offers')
        .select('*').eq('from_user_id', currentUser.id).eq('status', 'pending');
      const { data: allUsers } = await sb.from('profiles').select('id,nickname,avatar,color');
      const { data: allTeams } = await sb.from('fantasy_teams').select('*').eq('race_id', nextRace.id);

      const userMap = {};
      (allUsers || []).forEach(u => userMap[u.id] = u);
      const teamMap = {};
      (allTeams || []).forEach(t => teamMap[t.user_id] = t);

      let html = `<span class="mclose" onclick="closeMod()">✕</span>
    <div class="mtitle">💱 Mercato Trasferimenti</div>`;

      if (!marketOpen) {
        html += `<div class="status-banner sb-warn">🔒 Mercato chiuso — le operazioni sono disponibili solo quando l'admin apre il mercato.</div>`;
      }

      // ── Il mio team attuale ──
      const d1 = myTeam?.driver1, d2 = myTeam?.driver2, t1 = myTeam?.team1;
      html += `<div class="stitle">👤 Il Mio Team Attuale</div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-bottom:12px">`;
      const slotStyle = (val) => `background:var(--s1);border:1px solid ${val ? 'rgba(225,6,0,.3)' : 'var(--border)'};border-radius:10px;padding:10px;text-align:center`;
      [['P1', d1, 'driver'], ['P2', d2, 'driver'], ['Scuderia', t1, 'team']].forEach(([label, val, type]) => {
        const item = type === 'driver' ? DRIVERS_2026.find(d => d.name === val) : null;
        const price = type === 'driver' ? (item?.price || 0) : (TEAM_PRICES_2026[val] || 0);
        html += `<div style="${slotStyle(val)}">
      <div style="font-size:8px;color:var(--t3);letter-spacing:1px;margin-bottom:4px">${label}</div>
      <div style="font-weight:900;font-size:12px">${val ? val.split(' ').pop() : '—'}</div>
      ${val ? `<div style="font-size:10px;color:var(--gold);margin-top:3px">${price}cr</div>` : ''}
    </div>`;
      });
      html += `</div><div style="font-size:11px;color:var(--yellow);margin-bottom:14px">💰 Crediti disponibili: <strong>${myCredits} cr</strong></div>`;

      // ── SVINCOLO ──
      html += `<div class="stitle">🔓 Svincola un Giocatore</div>
  <div style="font-size:11px;color:var(--t2);margin-bottom:10px">Ricevi il <strong>valore di mercato attuale</strong> del pilota/scuderia (non il prezzo d'asta pagato).</div>`;

      if (!marketOpen) {
        html += `<div style="opacity:.4;pointer-events:none">`;
      }
      const releaseItems = [
        { label: 'Pilota 1', val: d1, type: 'driver' },
        { label: 'Pilota 2', val: d2, type: 'driver' },
        { label: 'Scuderia', val: t1, type: 'team' },
      ].filter(x => x.val);

      if (releaseItems.length === 0) {
        html += `<div style="color:var(--t3);font-size:12px;padding:10px;text-align:center">Nessun giocatore nel team</div>`;
      } else {
        releaseItems.forEach(({ label, val, type }) => {
          const drv = type === 'driver' ? DRIVERS_2026.find(d => d.name === val) : null;
          const currentVal = type === 'driver' ? (drv?.price || 0) : (TEAM_PRICES_2026[val] || 0);
          html += `<div style="background:var(--s1);border:1px solid var(--border2);border-radius:12px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:10px">
        <div style="flex:1">
          <div style="font-weight:800;font-size:14px">${val}</div>
          <div style="font-size:10px;color:var(--t3)">${label} · Valore attuale: <span style="color:var(--gold)">${currentVal} cr</span></div>
        </div>
        <button class="btn btn-no btn-sm" onclick="confirmRelease('${val}','${type}',${currentVal},'${nextRace.id}')">
          🔓 Svincola (+${currentVal}cr)
        </button>
      </div>`;
        });
      }
      if (!marketOpen) html += `</div>`;

      // ── OFFERTE PRIVATE ──
      html += `<div class="stitle" style="margin-top:16px">📩 Offerte Private</div>`;

      // Offerte ricevute
      if ((receivedOffers || []).length > 0) {
        html += `<div style="font-size:10px;color:var(--green);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">📥 Ricevute (${receivedOffers.length})</div>`;
        (receivedOffers || []).forEach(offer => {
          const fromUser = userMap[offer.from_user_id];
          html += `<div style="background:rgba(0,232,135,.04);border:1px solid rgba(0,232,135,.2);border-radius:12px;padding:12px;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:8px">
          <div class="av" style="background:${fromUser?.color || '#333'};width:24px;height:24px;font-size:11px">${fromUser?.avatar || '?'}</div>
          <div style="font-weight:700;font-size:13px">${fromUser?.nickname || '?'}</div>
          <div style="margin-left:auto;font-size:10px;color:var(--t3)">${new Date(offer.created_at).toLocaleDateString('it-IT')}</div>
        </div>
        <div style="font-size:12px;margin-bottom:4px">${formatOfferDescription(offer, userMap, teamMap)}</div>
        ${offer.message ? `<div style="font-size:11px;color:var(--t3);margin-bottom:8px;font-style:italic">"${offer.message}"</div>` : ''}
        <div style="display:flex;gap:6px">
          <button class="btn btn-ok btn-sm" style="flex:1" onclick="respondOffer('${offer.id}','accept','${nextRace.id}')">✅ Accetta</button>
          <button class="btn btn-no btn-sm" style="flex:1" onclick="respondOffer('${offer.id}','decline','${nextRace.id}')">❌ Rifiuta</button>
        </div>
      </div>`;
        });
      }

      // Offerte inviate
      if ((sentOffers || []).length > 0) {
        html += `<div style="font-size:10px;color:var(--t3);letter-spacing:2px;text-transform:uppercase;margin:10px 0 6px">📤 Inviate (${sentOffers.length})</div>`;
        (sentOffers || []).forEach(offer => {
          const toUser = userMap[offer.to_user_id];
          html += `<div style="background:var(--s1);border:1px solid var(--border2);border-radius:12px;padding:10px;margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px">
          <div style="font-size:11px;color:var(--t2)">→ <strong>${toUser?.nickname || '?'}</strong></div>
          <div style="margin-left:auto;font-size:9px;color:#ffaa00;background:rgba(255,170,0,.1);border:1px solid rgba(255,170,0,.3);border-radius:4px;padding:2px 6px">IN ATTESA</div>
        </div>
        <div style="font-size:11px;color:var(--t3)">${formatOfferDescription(offer, userMap, teamMap)}</div>
        <button class="btn btn-g btn-sm" style="margin-top:8px;width:100%" onclick="cancelOffer('${offer.id}')">🗑️ Annulla offerta</button>
      </div>`;
        });
      }

      // Form nuova offerta
      if (marketOpen) {
        const otherUsers = (allUsers || []).filter(u => u.id !== currentUser.id);
        const myItems = releaseItems;

        html += `<div style="background:var(--s2);border:1px solid var(--border2);border-radius:14px;padding:14px;margin-top:10px">
      <div style="font-family:'Exo 2',sans-serif;font-weight:900;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--purple);margin-bottom:12px">+ Nuova Offerta</div>
      <div class="fg">
        <label>Invia a</label>
        <select class="fi fi-sel" id="offer-to-user" onchange="updateOfferTargetItems()">
          <option value="">— Seleziona giocatore —</option>
          ${otherUsers.map(u => `<option value="${u.id}">${u.avatar} ${u.nickname}</option>`).join('')}
        </select>
      </div>
      <div class="fg">
        <label>Tipo di offerta</label>
        <select class="fi fi-sel" id="offer-type" onchange="updateOfferForm()">
          <option value="buy">💰 Acquisto — offro crediti per un loro pilota/scuderia</option>
          <option value="swap">🔄 Scambio — offro mio pilota/scuderia (+ eventuale conguaglio)</option>
        </select>
      </div>
      <div id="offer-form-dynamic">
        <div class="fg">
          <label>Loro elemento che voglio</label>
          <select class="fi fi-sel" id="offer-want-item"><option value="">— Prima seleziona il giocatore —</option></select>
        </div>
        <div class="fg">
          <label>💰 Crediti che offro</label>
          <input class="fi" type="number" id="offer-credits" min="0" max="${myCredits}" value="0" placeholder="0">
        </div>
      </div>
      <div class="fg">
        <label>Messaggio (opzionale)</label>
        <input class="fi" type="text" id="offer-message" placeholder="Scrivi un messaggio..." maxlength="100">
      </div>
      <button class="btn btn-r btn-w" onclick="sendTradeOffer('${nextRace.id}')">📩 Invia Offerta</button>
    </div>`;
      } else {
        html += `<div style="opacity:.4;font-size:12px;color:var(--t3);text-align:center;padding:12px;border:1px dashed var(--border);border-radius:10px">🔒 Apri mercato per inviare offerte</div>`;
      }

      c.innerHTML = html;
      document.getElementById('moverlay').classList.remove('hidden');
    }

    function formatOfferDescription(offer, userMap, teamMap) {
      const parts = [];
      if (offer.offer_type === 'buy') {
        parts.push(`Acquisto <strong>${offer.want_item}</strong>`);
        if (offer.offer_credits > 0) parts.push(`per <span style="color:var(--gold)">${offer.offer_credits} cr</span>`);
      } else {
        parts.push(`Scambio <strong>${offer.offer_item}</strong> con <strong>${offer.want_item}</strong>`);
        if (offer.offer_credits > 0) parts.push(`+ <span style="color:var(--gold)">${offer.offer_credits} cr</span> conguaglio`);
        else if (offer.offer_credits < 0) parts.push(`tu aggiungi <span style="color:var(--gold)">${Math.abs(offer.offer_credits)} cr</span>`);
      }
      return parts.join(' ');
    }

    function updateOfferTargetItems() {
      const toUserId = document.getElementById('offer-to-user')?.value;
      const { data: allTeams } = { data: window._offerTeamsCache };
      updateOfferForm();
    }

    async function updateOfferForm() {
      const toUserId = document.getElementById('offer-to-user')?.value;
      const offerType = document.getElementById('offer-type')?.value;
      const formDiv = document.getElementById('offer-form-dynamic');
      if (!formDiv) return;

      const nextRace = getNextRace();
      if (!nextRace) return;

      // Carica team del target
      let targetTeam = null;
      if (toUserId) {
        const { data } = await sb.from('fantasy_teams').select('*').eq('user_id', toUserId).eq('race_id', nextRace.id).maybeSingle();
        targetTeam = data;
      }

      const targetItems = [];
      if (targetTeam?.driver1) targetItems.push({ val: targetTeam.driver1, type: 'driver' });
      if (targetTeam?.driver2) targetItems.push({ val: targetTeam.driver2, type: 'driver' });
      if (targetTeam?.team1) targetItems.push({ val: targetTeam.team1, type: 'team' });

      // Carica il mio team per lo scambio
      const { data: myTeam } = await sb.from('fantasy_teams').select('*').eq('user_id', currentUser.id).eq('race_id', nextRace.id).maybeSingle();
      const myItems = [];
      if (myTeam?.driver1) myItems.push({ val: myTeam.driver1, type: 'driver' });
      if (myTeam?.driver2) myItems.push({ val: myTeam.driver2, type: 'driver' });
      if (myTeam?.team1) myItems.push({ val: myTeam.team1, type: 'team' });

      // Crediti disponibili
      const { data: lots } = await sb.from('auction_lots').select('final_price,winner_id').eq('status', 'sold');
      const { data: pups } = await sb.from('powerup_purchases').select('cost').eq('user_id', currentUser.id);
      const spentAuction = (lots || []).filter(l => l.winner_id === currentUser.id && l.item_type !== 'economy_delta').reduce((s, l) => s + (l.final_price || 0), 0);
      const spentEcoDelta = (lots || []).filter(l => l.winner_id === currentUser.id && l.item_type === 'economy_delta').reduce((s, l) => s + (l.final_price || 0), 0);
      const spentPU = (pups || []).reduce((s, p) => s + (p.cost || 0), 0);
      const myCredits = AUCTION_BUDGET - spentAuction - spentPU - spentEcoDelta;

      let html = `<div class="fg">
    <label>Loro elemento che voglio</label>
    <select class="fi fi-sel" id="offer-want-item">
      <option value="">— Seleziona —</option>
      ${targetItems.map(i => {
        const drv = i.type === 'driver' ? DRIVERS_2026.find(d => d.name === i.val) : null;
        const price = i.type === 'driver' ? (drv?.price || 0) : (TEAM_PRICES_2026[i.val] || 0);
        return `<option value="${i.val}|${i.type}">${i.val} (${i.type === 'driver' ? 'Pilota' : 'Scuderia'}) — ${price}cr</option>`;
      }).join('')}
    </select>
  </div>`;

      if (offerType === 'swap') {
        html += `<div class="fg">
      <label>Mio elemento che offro</label>
      <select class="fi fi-sel" id="offer-my-item">
        <option value="">— Seleziona —</option>
        ${myItems.map(i => {
          const drv = i.type === 'driver' ? DRIVERS_2026.find(d => d.name === i.val) : null;
          const price = i.type === 'driver' ? (drv?.price || 0) : (TEAM_PRICES_2026[i.val] || 0);
          return `<option value="${i.val}|${i.type}">${i.val} (${i.type === 'driver' ? 'Pilota' : 'Scuderia'}) — ${price}cr</option>`;
        }).join('')}
      </select>
    </div>
    <div class="fg">
      <label>💰 Conguaglio crediti (positivo = io do, negativo = tu dai)</label>
      <input class="fi" type="number" id="offer-credits" min="${-myCredits}" max="${myCredits}" value="0" placeholder="0">
    </div>`;
      } else {
        html += `<div class="fg">
      <label>💰 Crediti che offro</label>
      <input class="fi" type="number" id="offer-credits" min="0" max="${myCredits}" value="0" placeholder="0">
    </div>`;
      }

      formDiv.innerHTML = html;
    }

    async function sendTradeOffer(raceId) {
      const toUserId = document.getElementById('offer-to-user')?.value;
      const offerType = document.getElementById('offer-type')?.value;
      const wantRaw = document.getElementById('offer-want-item')?.value;
      const myItemRaw = document.getElementById('offer-my-item')?.value;
      const credits = parseInt(document.getElementById('offer-credits')?.value) || 0;
      const message = document.getElementById('offer-message')?.value || '';

      if (!toUserId) { showToast('Seleziona il giocatore', 'err'); return; }
      if (!wantRaw) { showToast('Seleziona l\'elemento che vuoi', 'err'); return; }
      if (offerType === 'swap' && !myItemRaw) { showToast('Seleziona il tuo elemento per lo scambio', 'err'); return; }

      const [wantItem, wantType] = wantRaw.split('|');
      const [myItem, myItemType] = myItemRaw ? myItemRaw.split('|') : [null, null];

      // Validazioni crediti
      if (offerType === 'buy' && credits <= 0) { showToast('Devi offrire almeno 1 cr per un acquisto', 'err'); return; }

      // Verifica che ho abbastanza crediti
      const { data: lots } = await sb.from('auction_lots').select('final_price,winner_id').eq('status', 'sold');
      const { data: pups } = await sb.from('powerup_purchases').select('cost').eq('user_id', currentUser.id);
      const spentAuction = (lots || []).filter(l => l.winner_id === currentUser.id && l.item_type !== 'economy_delta').reduce((s, l) => s + (l.final_price || 0), 0);
      const spentEcoDelta = (lots || []).filter(l => l.winner_id === currentUser.id && l.item_type === 'economy_delta').reduce((s, l) => s + (l.final_price || 0), 0);
      const spentPU = (pups || []).reduce((s, p) => s + (p.cost || 0), 0);
      const myCredits = AUCTION_BUDGET - spentAuction - spentPU - spentEcoDelta;

      const creditsNeeded = offerType === 'buy' ? credits : Math.max(0, credits);
      if (creditsNeeded > myCredits) { showToast(`Crediti insufficienti (hai ${myCredits}cr)`, 'err'); return; }

      const { error } = await sb.from('trade_offers').insert({
        from_user_id: currentUser.id,
        to_user_id: toUserId,
        race_id: raceId,
        offer_type: offerType,
        offer_item: myItem || null,
        offer_item_type: myItemType || null,
        want_item: wantItem,
        want_item_type: wantType,
        offer_credits: credits,
        message: message,
        status: 'pending'
      });

      if (error) { showToast('❌ ' + error.message, 'err'); return; }
      await sb.from('admin_log').insert({
        action: `Offerta privata: ${currentProfile?.nickname} → ${toUserId} (${offerType}: ${wantItem}${credits ? ', ' + credits + 'cr' : ''})`,
        by_user: currentProfile?.nickname || '?'
      });
      showToast('📩 Offerta inviata!', 'ok');
      openReleasePanel();
    }

    async function respondOffer(offerId, response, raceId) {
      const { data: offer } = await sb.from('trade_offers').select('*').eq('id', offerId).single();
      if (!offer || offer.status !== 'pending') { showToast('Offerta non più valida', 'err'); return; }

      if (response === 'decline') {
        await sb.from('trade_offers').update({ status: 'declined', resolved_at: new Date().toISOString() }).eq('id', offerId);
        showToast('❌ Offerta rifiutata', 'ok');
        openReleasePanel();
        return;
      }

      // ACCETTA — esegui lo scambio
      const nextRace = getNextRace();
      if (!nextRace) { showToast('Nessuna gara attiva', 'err'); return; }

      // Carica i due team
      const [{ data: fromTeam }, { data: toTeam }] = await Promise.all([
        sb.from('fantasy_teams').select('*').eq('user_id', offer.from_user_id).eq('race_id', raceId).maybeSingle(),
        sb.from('fantasy_teams').select('*').eq('user_id', offer.to_user_id).eq('race_id', raceId).maybeSingle(),
      ]);

      if (!fromTeam || !toTeam) { showToast('Errore: team non trovato', 'err'); return; }

      // Verifica che gli elementi sono ancora nei team
      if (offer.offer_type === 'buy') {
        // toTeam (io che accetto) deve avere want_item
        const hasWant = [toTeam.driver1, toTeam.driver2, toTeam.team1].includes(offer.want_item);
        if (!hasWant) { showToast(`❌ ${offer.want_item} non è più nel tuo team!`, 'err'); return; }
      } else {
        const fromHasOffer = [fromTeam.driver1, fromTeam.driver2, fromTeam.team1].includes(offer.offer_item);
        const toHasWant = [toTeam.driver1, toTeam.driver2, toTeam.team1].includes(offer.want_item);
        if (!fromHasOffer) { showToast(`❌ ${offer.offer_item} non è più nel team dell'offerente!`, 'err'); return; }
        if (!toHasWant) { showToast(`❌ ${offer.want_item} non è più nel tuo team!`, 'err'); return; }
      }

      // Esegui trasferimento
      const updFrom = { ...fromTeam };
      const updTo = { ...toTeam };

      if (offer.offer_type === 'buy') {
        // fromUser paga crediti, toUser (me) cede want_item
        // Rimuovi want_item dal mio team (toTeam)
        if (updTo.driver1 === offer.want_item) updTo.driver1 = null;
        else if (updTo.driver2 === offer.want_item) updTo.driver2 = null;
        else if (updTo.team1 === offer.want_item) updTo.team1 = null;

        // Aggiungi want_item nel team di fromUser
        if (offer.want_item_type === 'driver') {
          if (!updFrom.driver1) updFrom.driver1 = offer.want_item;
          else if (!updFrom.driver2) updFrom.driver2 = offer.want_item;
          else updFrom.driver1 = offer.want_item;
        } else {
          updFrom.team1 = offer.want_item;
        }
      } else {
        // SCAMBIO: fromUser cede offer_item, toUser cede want_item
        if (updFrom.driver1 === offer.offer_item) updFrom.driver1 = offer.want_item;
        else if (updFrom.driver2 === offer.offer_item) updFrom.driver2 = offer.want_item;
        else if (updFrom.team1 === offer.offer_item) updFrom.team1 = offer.want_item;

        if (updTo.driver1 === offer.want_item) updTo.driver1 = offer.offer_item;
        else if (updTo.driver2 === offer.want_item) updTo.driver2 = offer.offer_item;
        else if (updTo.team1 === offer.want_item) updTo.team1 = offer.offer_item;
      }

      // Salva entrambi i team aggiornati
      await Promise.all([
        sb.from('fantasy_teams').upsert({ ...updFrom, saved_at: new Date().toISOString() }, { onConflict: 'user_id,race_id' }),
        sb.from('fantasy_teams').upsert({ ...updTo, saved_at: new Date().toISOString() }, { onConflict: 'user_id,race_id' }),
        sb.from('trade_offers').update({ status: 'accepted', resolved_at: new Date().toISOString() }).eq('id', offerId),
      ]);

      // Registra trasferimento crediti su auction_lots (log virtuale)
      if (offer.offer_credits !== 0) {
        await sb.from('admin_log').insert({
          action: `Trade crediti: ${offer.offer_credits > 0 ? 'da ' + offer.from_user_id + ' a ' + offer.to_user_id : 'da ' + offer.to_user_id + ' a ' + offer.from_user_id} — ${Math.abs(offer.offer_credits)}cr`,
          by_user: currentProfile?.nickname || '?'
        });
        // Aggiusta saldo: crea lotti fittizi di compensazione
        if (offer.offer_credits > 0) {
          // fromUser paga offer_credits a toUser — registriamo come lotto fittizio venduto a fromUser
          await sb.from('auction_lots').insert({
            item_type: 'transfer_fee', item_name: 'Conguaglio: ' + offer.want_item,
            base_price: offer.offer_credits, current_bid: offer.offer_credits,
            winner_id: offer.from_user_id, final_price: offer.offer_credits,
            status: 'sold', created_at: new Date().toISOString(), closed_at: new Date().toISOString()
          });
        } else if (offer.offer_credits < 0) {
          // toUser paga abs(offer_credits) a fromUser
          await sb.from('auction_lots').insert({
            item_type: 'transfer_fee', item_name: 'Conguaglio: ' + offer.offer_item,
            base_price: Math.abs(offer.offer_credits), current_bid: Math.abs(offer.offer_credits),
            winner_id: offer.to_user_id, final_price: Math.abs(offer.offer_credits),
            status: 'sold', created_at: new Date().toISOString(), closed_at: new Date().toISOString()
          });
        }
      }

      await sb.from('admin_log').insert({
        action: `Trade completato: ${offer.offer_type === 'buy' ? offer.want_item + ' acquistato' : offer.offer_item + ' ↔ ' + offer.want_item}`,
        by_user: currentProfile?.nickname || '?'
      });
      showToast('✅ Scambio completato!', 'gold');
      openReleasePanel();
      invalidateCache('allteams_' + raceId);
    }

    async function cancelOffer(offerId) {
      await sb.from('trade_offers').update({ status: 'cancelled', resolved_at: new Date().toISOString() }).eq('id', offerId);
      showToast('🗑️ Offerta annullata', 'ok');
      openReleasePanel();
    }

    async function confirmRelease(itemName, itemType, currentValue, raceId) {
      if (!confirm(`Svincolare ${itemName}?\n\nRiceverai ${currentValue} crediti (valore di mercato attuale).\nAttenzione: l'elemento tornerà disponibile per l'asta!`)) return;

      const nextRace = getNextRace();
      if (!nextRace) return;

      const { data: myTeam } = await sb.from('fantasy_teams').select('*').eq('user_id', currentUser.id).eq('race_id', nextRace.id).maybeSingle();
      if (!myTeam) { showToast('Team non trovato', 'err'); return; }

      const updTeam = { ...myTeam };
      if (updTeam.driver1 === itemName) updTeam.driver1 = null;
      else if (updTeam.driver2 === itemName) updTeam.driver2 = null;
      else if (updTeam.team1 === itemName) updTeam.team1 = null;

      // Salva team aggiornato
      await sb.from('fantasy_teams').upsert({ ...updTeam, saved_at: new Date().toISOString() }, { onConflict: 'user_id,race_id' });

      // Aggiungi crediti (lotto fittizio con rimborso)
      await sb.from('auction_lots').insert({
        item_type: 'release_refund',
        item_name: 'Svincolo: ' + itemName,
        base_price: currentValue,
        current_bid: currentValue,
        winner_id: currentUser.id,   // winner = chi riceve i crediti... ma qui li RICEVE
        final_price: -currentValue,  // negativo = rimborso (sottrae dalla spesa)
        status: 'sold',
        created_at: new Date().toISOString(),
        closed_at: new Date().toISOString()
      });

      await sb.from('admin_log').insert({
        action: 'Svincolo: ' + (currentProfile?.nickname || '?') + ' libera ' + itemName + ' (+' + currentValue + 'cr)',
        by_user: currentProfile?.nickname || '?'
      });

      invalidateCache('allteams_' + raceId);
      showToast(`✅ ${itemName} svincolato! +${currentValue}cr`, 'gold');
      openReleasePanel();
    }
