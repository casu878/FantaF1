// ══════════════════ HOME ══════════════════

    function getNextRace() { const now = Date.now(); return CALENDAR_2026.find(r => new Date(r.sessions.race).getTime() > now); }
    function getActiveRace() {
      const now = Date.now();
      return CALENDAR_2026.find(r => { const s = new Date(r.sessions.race).getTime(); return now >= s && now <= s + 7200000; });
    }

    async function renderHome() {
      const next = getNextRace();
      const cdbox = document.getElementById('cdbox');
      if (next) {
        cdbox.innerHTML = `
      <div class="cdcard">
        <div class="cd-flag">${next.flag}</div>
        <div class="cd-name">R${next.round} · ${next.name}</div>
        <div class="cd-sub">${next.circuit} · ${fmtIt(next.sessions.race)}${next.sprint ? ' · Sprint' : ''}</div>
        ${next.sprint ? '<div class="sbadge">🟣 SPRINT WEEKEND</div>' : ''}
        <div id="cd-session-label" style="margin:10px 0 4px"></div>
        <div class="cd-grid" id="cd-grid" style="margin-top:6px">
          <div class="cdu"><div class="cdn" id="cdd">--</div><div class="cdl">Giorni</div></div>
          <div class="cdu"><div class="cdn" id="cdh">--</div><div class="cdl">Ore</div></div>
          <div class="cdu"><div class="cdn" id="cdm">--</div><div class="cdl">Min</div></div>
          <div class="cdu"><div class="cdn" id="cds">--</div><div class="cdl">Sec</div></div>
        </div>
        <div style="display:flex;gap:7px;margin-top:12px">
          <button class="btn btn-r" style="flex:1" onclick="navTo('fantasy')">🏎️ Scegli Team</button>
          <button class="btn btn-g" style="flex:1" onclick="navTo('predict')">📝 Pronostico</button>
        </div>
      </div>`;
        startCountdown();
      } else {
        cdbox.innerHTML = '<div class="cdcard"><div class="cd-name">🏁 Stagione 2026 conclusa</div></div>';
      }
      const profiles = await cachedQuery('home_profiles', async () => {
        const { data } = await sb.from('profiles').select('id,nickname,avatar,color,total_pts').order('total_pts', { ascending: false });
        return data;
      }, 20000); // 20s cache per home leaderboard
      const me = currentProfile?.id;
      document.getElementById('home-lb').innerHTML = (profiles || []).slice(0, 6).map((p, i) => `
    <div class="lbrow${i === 0 ? ' top1' : ''}${p.id === me ? ' me' : ''}">
      <div class="lbpos ${['g', 's', 'b'][i] || ''}">${['🥇', '🥈', '🥉'][i] || i + 1}</div>
      <div class="av" style="background:${p.color};width:26px;height:26px;font-size:12px;flex-shrink:0">${p.avatar}</div>
      <div class="lbname">${p.nickname}${p.id === me ? ' <span style="color:var(--red);font-size:9px">(tu)</span>' : ''}</div>
      <div><div class="lbpts">${p.total_pts}</div><div class="lbptsl">pts</div></div>
    </div>`).join('') || '<div style="color:var(--t3);font-size:12px;text-align:center;padding:16px">Nessun giocatore ancora.</div>';
    }

    function startCountdown() {
      if (cdInterval) clearInterval(cdInterval);
      function tick() {
        const next = getNextRace(); if (!next) return;
        const now = new Date();
        const isSprint = next.sprint;

        // Session windows — qualifiche ~75min, sprint qual ~60min, sprint ~45min, gara ~2h
        const qualStart = new Date(next.sessions.qual);
        const qualEnd = new Date(qualStart.getTime() + 75 * 60 * 1000);   // 1h15
        const raceStart = new Date(next.sessions.race);
        const raceEnd = new Date(raceStart.getTime() + 2 * 3600 * 1000);  // 2h
        const sprintStart = isSprint ? new Date(next.sessions.spr) : null;
        const sprintEnd = sprintStart ? new Date(sprintStart.getTime() + 45 * 60 * 1000) : null;
        const sqStart = isSprint ? new Date(next.sessions.sq) : null;
        const sqEnd = sqStart ? new Date(sqStart.getTime() + 60 * 60 * 1000) : null;

        const elLabel = document.getElementById('cd-session-label');
        const elGrid = document.getElementById('cd-grid');

        // Determine current state
        let state, targetTime, labelText;

        if (now >= raceStart && now <= raceEnd) {
          state = 'race_live';
        } else if (now >= qualStart && now <= qualEnd && !liveData.qualiFinished) {
          state = 'qual_live';
        } else if (isSprint && sprintStart && now >= sprintStart && now <= sprintEnd) {
          state = 'sprint_live';
        } else if (isSprint && sqStart && now >= sqStart && now <= sqEnd) {
          state = 'sq_live';
        } else if (now < qualStart) {
          state = 'before_qual';
          targetTime = qualStart;
          labelText = isSprint ? '⏱ SPRINT QUALIFYING TRA' : '⏱ QUALIFICHE TRA';
        } else if (now >= qualEnd && isSprint && sprintStart && now < sprintStart) {
          // Dopo qual, prima sprint
          state = 'before_sprint';
          targetTime = sprintStart;
          labelText = '⏱ SPRINT TRA';
        } else if (now >= qualEnd && now < raceStart) {
          // Dopo qualifiche (o dopo sprint), prima della gara — countdown gara
          state = 'before_race';
          targetTime = raceStart;
          labelText = '⏱ GARA TRA';
        } else if (now > raceEnd) {
          state = 'done';
        } else {
          state = 'before_race';
          targetTime = raceStart;
          labelText = '⏱ GARA TRA';
        }

        if (!elLabel || !elGrid) return;

        if (state === 'qual_live' || state === 'sq_live') {
          elLabel.innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px;background:#001a0a;border:1px solid var(--green);border-radius:6px;padding:5px 12px;color:var(--green);font-size:13px;font-weight:900;letter-spacing:2px"><span style="width:8px;height:8px;border-radius:50%;background:var(--green);animation:pd 1s infinite;display:inline-block"></span>' + (state === 'sq_live' ? 'SPRINT QUALIFYING LIVE' : 'QUALIFICHE LIVE') + '</span>';
          elGrid.style.display = 'none';
        } else if (state === 'sprint_live') {
          elLabel.innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px;background:#1a0030;border:1px solid var(--purple);border-radius:6px;padding:5px 12px;color:var(--purple);font-size:13px;font-weight:900;letter-spacing:2px"><span style="width:8px;height:8px;border-radius:50%;background:var(--purple);animation:pd 1s infinite;display:inline-block"></span>SPRINT LIVE</span>';
          elGrid.style.display = 'none';
        } else if (state === 'race_live') {
          elLabel.innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px;background:#1a0000;border:1px solid var(--red);border-radius:6px;padding:5px 12px;color:var(--red);font-size:13px;font-weight:900;letter-spacing:2px"><span style="width:8px;height:8px;border-radius:50%;background:var(--red);animation:pd 1s infinite;display:inline-block"></span>GARA LIVE</span>';
          elGrid.style.display = 'none';
        } else if (state === 'done') {
          elLabel.innerHTML = '<span style="color:var(--t3);font-size:12px">🏁 Weekend completato</span>';
          elGrid.style.display = 'none';
        } else if (targetTime) {
          const diff = targetTime - now;
          if (diff <= 0) {
            // Countdown arrivato a 0 — se era per le qualifiche, paga gli stipendi
            if (state === 'before_qual') {
              autoDeductSalaries(next.id).catch(console.error);
            }
            tick(); return;
          }
          const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000),
            m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
          elLabel.innerHTML = `<span style="font-size:10px;letter-spacing:3px;color:var(--t3);text-transform:uppercase">${labelText}</span>`;
          elGrid.style.display = 'grid';
          const el = id => document.getElementById(id);
          if (el('cdd')) el('cdd').textContent = String(d).padStart(2, '0');
          if (el('cdh')) el('cdh').textContent = String(h).padStart(2, '0');
          if (el('cdm')) el('cdm').textContent = String(m).padStart(2, '0');
          if (el('cds')) el('cds').textContent = String(s).padStart(2, '0');
        }
      }
      tick(); cdInterval = setInterval(tick, 1000);
    }


    // ══════════════════ CLASSIFICA ══════════════════

    async function renderStandings(tab) {
      currentStab = tab;
      ['gen', 'gp', 'pred', 'cal'].forEach(t => {
        const b = document.getElementById('stab-' + t);
        if (b) b.className = 'btn btn-sm ' + (t === tab ? 'btn-r' : 'btn-g');
      });
      const el = document.getElementById('stand-content');
      if (!el) return;

      if (tab === 'gen') {
        const [profiles, results] = await Promise.all([
          cachedQuery('stand_profiles', async () => {
            const { data } = await sb.from('profiles').select('*').order('total_pts', { ascending: false });
            return data;
          }, 20000),
          cachedQuery('stand_results_ids', async () => {
            const { data } = await sb.from('race_results').select('race_id');
            return data;
          }, 60000)
        ]);
        const me = currentProfile?.id;
        const leader = profiles?.[0];
        el.innerHTML = `
      <div class="card" style="margin-bottom:11px">
        <div class="ctitle" style="margin-bottom:11px">📈 Stagione 2026</div>
        <div class="srow"><span class="sl">🏆 Leader</span><span class="sv" style="color:var(--yellow)">${leader?.nickname || '—'}</span></div>
        <div class="srow"><span class="sl">👥 Giocatori</span><span class="sv">${profiles?.length || 0}</span></div>
        <div class="srow"><span class="sl">🏁 GP Disputati</span><span class="sv">${results?.length || 0} / 24</span></div>
        <div class="srow"><span class="sl">🟣 Sprint Weekends</span><span class="sv">6</span></div>
      </div>
      ${(profiles || []).map((p, i) => {
          const gap = leader && i > 0 ? leader.total_pts - p.total_pts : 0;
          return `
        <div class="lbrow${i === 0 ? ' top1' : ''}${p.id === me ? ' me' : ''}">
          <div class="lbpos ${['g', 's', 'b'][i] || ''}">${['🥇', '🥈', '🥉'][i] || i + 1}</div>
          <div class="av" style="background:${p.color};width:26px;height:26px;font-size:12px;flex-shrink:0">${p.avatar}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:13px">${p.nickname}${p.id === me ? ' <span style="color:var(--red);font-size:9px">(tu)</span>' : ''}</div>
            <div style="font-size:10px;color:var(--t3)">${p.gps_done || 0} GP · avg ${p.gps_done > 0 ? Math.round(p.total_pts / p.gps_done) : 0} pts</div>
          </div>
          <div style="text-align:right">
            <div class="lbpts">${p.total_pts}</div>
            ${i > 0 ? `<div class="lbptsl" style="color:#ff7070">-${gap}</div>` : '<div class="lbptsl" style="color:var(--yellow)">LEADER</div>'}
          </div>
        </div>`;
        }).join('')}`;

      } else if (tab === 'gp') {
        const [results, teams, preds] = await Promise.all([
          cachedQuery('race_results_all', async () => { const { data } = await sb.from('race_results').select('*'); return data; }, 60000),
          cachedQuery('stand_teams', async () => { const { data } = await sb.from('fantasy_teams').select('*,profiles(nickname,avatar,color,id)'); return data; }, 30000),
          cachedQuery('stand_preds', async () => { const { data } = await sb.from('predictions').select('*,profiles(nickname,avatar,color,id)'); return data; }, 30000)
        ]);
        const doneRaces = CALENDAR_2026.filter(r => results?.find(x => x.race_id === r.id));
        if (!doneRaces.length) { el.innerHTML = '<div style="color:var(--t3);text-align:center;padding:24px;font-size:12px">Nessun GP completato ancora.</div>'; return; }
        const me = currentProfile?.id;
        el.innerHTML = doneRaces.reverse().map(r => {
          const res = results?.find(x => x.race_id === r.id);
          const rTeams = (teams || []).filter(t => t.race_id === r.id);
          const scored = rTeams.map(t => {
            const pred = (preds || []).find(p => p.user_id === t.user_id && p.race_id === r.id);
            return { nick: t.profiles?.nickname || '?', av: t.profiles?.avatar || '?', col: t.profiles?.color || '#555', pts: calcTotalPts(t, pred, res), isMe: t.user_id === me };
          }).sort((a, b) => b.pts - a.pts);
          return `<div class="weekbox done">
        <div class="wname">${r.flag} R${r.round} · ${r.name} <span style="color:var(--green);font-size:10px;background:#001a0a;padding:2px 5px;border-radius:3px">✅</span></div>
        ${res ? `<div style="font-size:11px;color:var(--t2);margin-bottom:8px">🥇${res.p1 || '?'} · 🥈${res.p2 || '?'} · 🥉${res.p3 || '?'}${res.fastest ? ' · ⚡' + res.fastest.split(' ').pop() : ''}</div>` : ''}
        ${scored.map((p, i) => `
          <div class="lbrow${p.isMe ? ' me' : ''}" style="margin-bottom:4px">
            <div class="lbpos ${['g', 's', 'b'][i] || ''}">${['🥇', '🥈', '🥉'][i] || i + 1}</div>
            <div class="av" style="background:${p.col};width:22px;height:22px;font-size:10px;flex-shrink:0">${p.av}</div>
            <div class="lbname">${p.nick}</div>
            <div class="lbpts" style="font-size:15px">${p.pts}</div>
          </div>`).join('')}
      </div>`;
        }).join('');

      } else if (tab === 'pred') {
        // Classifica solo pronostici
        const [results, preds, teams] = await Promise.all([
          cachedQuery('race_results_all', async () => { const { data } = await sb.from('race_results').select('*'); return data; }, 60000),
          cachedQuery('stand_preds', async () => { const { data } = await sb.from('predictions').select('*,profiles(nickname,avatar,color,id)'); return data; }, 30000),
          cachedQuery('stand_teams_mini', async () => { const { data } = await sb.from('fantasy_teams').select('user_id,race_id'); return data; }, 30000)
        ]);
        const { data: profiles } = await sb.from('profiles').select('id,nickname,avatar,color');
        const me = currentProfile?.id;
        const doneResults = results || [];

        // Calc predict pts per user
        const userPredPts = {};
        (preds || []).forEach(p => {
          if (!userPredPts[p.user_id]) userPredPts[p.user_id] = { pts: 0, nick: p.profiles?.nickname || '?', av: p.profiles?.avatar || '?', col: p.profiles?.color || '#555', id: p.user_id };
          const res = doneResults.find(r => r.race_id === p.race_id);
          if (res) {
            const team = (teams || []).find(t => t.user_id === p.user_id && t.race_id === p.race_id);
            const { total } = calcPredPts(p, res, dbl);
            userPredPts[p.user_id].pts += total;
          }
        });

        const sorted = Object.values(userPredPts).sort((a, b) => b.pts - a.pts);
        el.innerHTML = `
      <div class="status-banner sb-purple">🔮 Classifica basata solo sui <strong>Pronostici</strong></div>
      ${sorted.length ? sorted.map((p, i) => `
        <div class="lbrow${p.id === me ? ' me' : ''}${i === 0 ? ' top1' : ''}">
          <div class="lbpos ${['g', 's', 'b'][i] || ''}">${i + 1}</div>
          <div class="av" style="background:${p.col};width:26px;height:26px;font-size:12px;flex-shrink:0">${p.av}</div>
          <div class="lbname">${p.nick}</div>
          <div><div class="lbpts" style="color:var(--purple)">${p.pts}</div><div class="lbptsl">pred pts</div></div>
        </div>`).join('')
            : '<div style="color:var(--t3);text-align:center;padding:24px;font-size:12px">Nessun GP completato ancora.</div>'}`;

      } else if (tab === 'cal') {
        const { data: results } = await sb.from('race_results').select('race_id');
        const doneIds = new Set((results || []).map(r => r.race_id));
        const now = new Date();
        const nextRace = getNextRace();
        el.innerHTML = `
      <div style="font-size:10px;color:var(--t3);margin-bottom:10px">📅 Calendario Stagione 2026 — 24 GP</div>
      ${CALENDAR_2026.map(r => {
          const raceDate = new Date(r.sessions.race);
          const isDone = doneIds.has(r.id);
          const isNext = r.id === nextRace?.id;
          const isPast = raceDate < now && !isDone;
          return `<div class="gp-item${isNext ? ' weekbox next' : ''}">
          <div class="gp-round">R${r.round}</div>
          <div style="font-size:18px;width:24px;text-align:center">${r.flag}</div>
          <div class="gp-info">
            <div class="gp-name">${r.name}${r.sprint ? ' <span style="font-size:9px;color:var(--purple)">🟣 Sprint</span>' : ''}</div>
            <div class="gp-date">${r.circuit} · ${fmtIt(r.sessions.race)}</div>
          </div>
          <div class="gp-status ${isDone ? 'gp-done' : isNext ? 'gp-next' : 'gp-future'}">${isDone ? '✅ Done' : isNext ? '⚡ Next' : isPast ? '⏳' : '📅'}</div>
        </div>`;
        }).join('')}`;
      }
    }
    function showStab(tab) { renderStandings(tab); }

    // ══════════════════ PROFILO ══════════════════

    async function openEditProfile() {
      const c = document.getElementById('mcontent');
      const p = currentProfile;
      const emojis = ['🏎️', '🏁', '🔥', '⚡', '🦁', '🐺', '🦊', '🐯', '🦅', '🚀', '💎', '🌟', '🎯', '🏆', '⚔️', '🎪', '🤖', '👑', '🦄', '💀', '🍀', '🌈', '🎭', '🎸', '🦋', '🌊', '🔮', '🎲', '🎰', '🛸'];
      const colors = ['#E10600', '#3671C6', '#FF8000', '#27F4D2', '#FF87BC', '#52E252', '#6692FF', '#FFD700', '#FF6B6B', '#4ECDC4', '#A8E6CF', '#FF8B94', '#B4A0E5', '#87CEEB', '#DDA0DD', '#98FB98'];

      c.innerHTML = `
    <span class="mclose" onclick="closeMod()">✕</span>
    <div class="mtitle">✏️ Modifica Profilo</div>

    <div class="fg">
      <label>Nickname</label>
      <input class="fi" type="text" id="edit-nick" value="${p.nickname}" maxlength="20" placeholder="Il tuo nickname">
    </div>

    <div class="fg">
      <label>Avatar (scegli emoji)</label>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-top:6px">
        ${emojis.map(e => `
          <button onclick="selectAvatar('${e}')" id="av-btn-${e}"
            style="font-size:22px;background:${e === p.avatar ? 'rgba(225,6,0,.2)' : 'var(--s2)'};border:1px solid ${e === p.avatar ? 'var(--red)' : 'var(--border)'};border-radius:8px;padding:6px;cursor:pointer;transition:all .2s"
            title="${e}">${e}</button>`).join('')}
      </div>
      <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
        <div id="av-preview" style="width:48px;height:48px;border-radius:50%;background:${p.color};display:flex;align-items:center;justify-content:center;font-size:22px">${p.avatar}</div>
        <div style="font-size:11px;color:var(--t3)">Anteprima</div>
      </div>
    </div>

    <div class="fg">
      <label>Colore profilo</label>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
        ${colors.map(col => `
          <button onclick="selectColor('${col}')" id="col-btn-${col.replace('#', 'col-')}"
            style="width:34px;height:34px;border-radius:50%;background:${col};border:2px solid ${col === p.color ? '#fff' : 'transparent'};cursor:pointer;transition:all .2s"
            title="${col}"></button>`).join('')}
      </div>
    </div>

    <button class="btn btn-r btn-w" onclick="saveEditProfile()">💾 Salva Profilo</button>
    <div id="edit-profile-err" class="errmsg" style="margin-top:8px"></div>
  `;
      window._editAvatar = p.avatar;
      window._editColor = p.color;
      document.getElementById('moverlay').classList.remove('hidden');
    }

    function selectAvatar(emoji) {
      window._editAvatar = emoji;
      // Update UI
      document.querySelectorAll('[id^="av-btn-"]').forEach(b => {
        const isSelected = b.id === 'av-btn-' + emoji;
        b.style.background = isSelected ? 'rgba(225,6,0,.2)' : 'var(--s2)';
        b.style.borderColor = isSelected ? 'var(--red)' : 'var(--border2)';
      });
      const prev = document.getElementById('av-preview');
      if (prev) prev.textContent = emoji;
    }

    function selectColor(color) {
      window._editColor = color;
      document.querySelectorAll('[id^="col-btn-"]').forEach(b => {
        b.style.borderColor = b.id === 'col-btn-' + color.replace('#', 'col-') ? '#fff' : 'transparent';
      });
      const prev = document.getElementById('av-preview');
      if (prev) prev.style.background = color;
    }

    async function saveEditProfile() {
      const nick = document.getElementById('edit-nick')?.value?.trim();
      const errEl = document.getElementById('edit-profile-err');
      if (!nick || nick.length < 2) { errEl.textContent = '⚠️ Nickname troppo corto (min 2 caratteri)'; errEl.className = 'errmsg err'; return; }
      if (nick.length > 20) { errEl.textContent = '⚠️ Nickname troppo lungo (max 20)'; errEl.className = 'errmsg err'; return; }

      // Controlla unicità nickname (se cambiato)
      if (nick !== currentProfile.nickname) {
        const { data: existing } = await sb.from('profiles').select('id').eq('nickname', nick).maybeSingle();
        if (existing && existing.id !== currentUser.id) {
          errEl.textContent = '❌ Nickname già in uso da un altro giocatore';
          errEl.className = 'errmsg err';
          return;
        }
      }

      const updates = {
        nickname: nick,
        avatar: window._editAvatar || currentProfile.avatar,
        color: window._editColor || currentProfile.color
      };

      const { error } = await sb.from('profiles').update(updates).eq('id', currentUser.id);
      if (error) { errEl.textContent = '❌ ' + error.message; errEl.className = 'errmsg err'; return; }

      // Aggiorna in memoria
      currentProfile = { ...currentProfile, ...updates };
      invalidateCache('home_profiles');
      invalidateCache('profile_rank');

      closeMod();
      showToast('✅ Profilo aggiornato!', 'ok');
      renderProfile();
      // Aggiorna topbar avatar
      const avEl = document.getElementById('topbar-av');
      if (avEl) { avEl.textContent = updates.avatar; avEl.style.background = updates.color; }
    }

    async function renderProfile() {
      if (!currentProfile) return;
      const p = currentProfile;
      document.getElementById('pav').textContent = p.avatar;
      document.getElementById('pav').style.background = p.color;
      document.getElementById('pname').textContent = p.nickname;
      document.getElementById('prole').textContent = p.role === 'admin' ? '⚙️ Admin' : '🏎️ Pilota';

      const [profiles, allTeams, results, preds] = await Promise.all([
        cachedQuery('profile_rank', async () => {
          const { data } = await sb.from('profiles').select('id,total_pts').order('total_pts', { ascending: false });
          return data;
        }),
        cachedQuery('myteams_' + currentUser.id, async () => {
          const { data } = await sb.from('fantasy_teams').select('user_id,driver1,driver2,team1,race_id').eq('user_id', currentUser.id);
          return data;
        }, 60000),
        cachedQuery('race_results_all', async () => {
          const { data } = await sb.from('race_results').select('race_id,p1,p2,p3,p4,p5,p6,p7,p8,p9,p10,pole,p2_qual,fastest,sc_count,rf,dnf_drivers,sprint_win,retires_count,best_weekend_driver,grid_positions,q2_drivers,qual_p1,qual_p2,qual_p3,qual_p4,qual_p5,qual_p6,qual_p7,qual_p8,qual_p9,qual_p10,dsq_drivers,dnq_drivers,penalty_drivers,pit_times,overtakes,sprint_order,sprint_p2,sprint_p3,sprint_fastest,sprint_grid,sprint_dnf_drivers,sprint_overtakes,fastest_pit_team,best_comeback,constructor_best,first_dnf');
          return data;
        }, 60000),
        cachedQuery('mypreds_' + currentUser.id, async () => {
          const { data } = await sb.from('predictions').select('*').eq('user_id', currentUser.id);
          return data;
        }, 60000),
      ]);

      const rank = (profiles || []).findIndex(x => x.id === p.id) + 1;

      // Best GP
      let bestGp = 0, bestGpName = '';
      (allTeams || []).forEach(t => {
        const res = (results || []).find(r => r.race_id === t.race_id);
        if (res) {
          const pred = (preds || []).find(pr => pr.race_id === t.race_id);
          const pts = calcTotalPts(t, pred, res);
          if (pts > bestGp) { bestGp = pts; bestGpName = CALENDAR_2026.find(r => r.id === t.race_id)?.name || t.race_id; }
        }
      });

      document.getElementById('pstats').innerHTML = `
    <div class="srow"><span class="sl">🏆 Punti Totali</span><span class="sv" style="color:var(--red)">${p.total_pts}</span></div>
    <div class="srow"><span class="sl">📊 Posizione</span><span class="sv">#${rank} di ${profiles?.length || 0}</span></div>
    <div class="srow"><span class="sl">🏁 GP completati</span><span class="sv">${p.gps_done || 0}</span></div>
    <div class="srow"><span class="sl">📈 Media pts/GP</span><span class="sv">${p.gps_done > 0 ? Math.round(p.total_pts / p.gps_done) : 0}</span></div>
    ${bestGpName ? `<div class="srow"><span class="sl">⭐ Miglior GP</span><span class="sv">${bestGpName} <span style="color:var(--yellow)">${bestGp} pts</span></span></div>` : ''}`;

      // Power-Up section
      (async () => {
        const puBox = document.getElementById('pu-profile-box');
        if (!puBox || !currentUser) return;
        const [{ data: myPups }, { data: myLots }] = await Promise.all([
          sb.from('powerup_purchases').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }),
          sb.from('auction_lots').select('final_price,item_type').eq('winner_id', currentUser.id).eq('status', 'sold')
        ]);
        const spentAuction = (myLots || []).filter(l => l.item_type !== 'economy_delta').reduce((s, l) => s + (l.final_price || 0), 0);
        const spentEco = (myLots || []).filter(l => l.item_type === 'economy_delta').reduce((s, l) => s + (l.final_price || 0), 0);
        const spentPU = (myPups || []).reduce((s, p) => s + (p.cost || 0), 0);
        const avail = AUCTION_BUDGET - spentAuction - spentPU - spentEco;
        if (!myPups?.length) {
          puBox.innerHTML = `<div style="color:var(--t3);font-size:12px">Nessun power-up acquistato.<br><span style="color:var(--gold)">${avail}cr disponibili</span> nel negozio (tab Team).</div>`;
          return;
        }
        const grouped = {};
        (myPups || []).forEach(p => { if (!grouped[p.race_id]) grouped[p.race_id] = []; grouped[p.race_id].push(p); });
        puBox.innerHTML = `<div style="font-size:11px;color:var(--gold);margin-bottom:8px">💰 ${avail}cr rimasti · Spesi in PU: ${spentPU}cr</div>`
          + Object.entries(grouped).map(([rid, pups]) => {
            const cal = CALENDAR_2026.find(r => r.id === rid);
            return `<div style="margin-bottom:8px">
          <div style="font-size:10px;color:var(--t3);margin-bottom:4px">${cal ? `${cal.flag} R${cal.round} ${cal.name}` : rid}</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">${pups.map(p => {
              const pu = POWERUPS[p.powerup_id];
              return pu ? `<span style="background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.2);border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700">${pu.ico} ${pu.name} <span style="color:var(--t3)">−${p.cost}cr</span></span>` : '';
            }).join('')}</div>
        </div>`;
          }).join('');
      })();

      document.getElementById('padmin-btn').innerHTML = p.role === 'admin'
        ? `<button class="btn btn-g btn-w" style="margin-bottom:11px" onclick="navTo('admin')">⚙️ Pannello Admin</button>` : '';

      // Storico
      const doneRaces = CALENDAR_2026.filter(r => (results || []).find(x => x.race_id === r.id));
      document.getElementById('phist').innerHTML = doneRaces.length === 0
        ? '<div style="color:var(--t3);text-align:center;padding:18px;font-size:12px">Nessun GP completato ancora.</div>'
        : doneRaces.reverse().map(r => {
          const team = (allTeams || []).find(t => t.race_id === r.id);
          const pred = (preds || []).find(pr => pr.race_id === r.id);
          const res = (results || []).find(x => x.race_id === r.id);
          const pts = calcTotalPts(team, pred, res);
          const fantPts = team ? calcFantasyPts(team, res, false).total : 0;
          const predPts = pred ? calcPredPts(pred, res, false).total : 0;
          return `<div class="rcard" onclick="showGPBreakdown('${r.id}')">
          <div style="font-size:20px;width:24px;text-align:center">${r.flag}</div>
          <div style="flex:1">
            <div style="font-weight:700;font-size:13px">R${r.round} · ${r.name}</div>
            <div style="font-size:10px;color:var(--t2)">${team ? [team.driver1, team.driver2, team.driver3].filter(Boolean).map(n => n.split(' ').pop()).join(', ') : '❌ No team'}</div>
            ${pts ? `<div style="font-size:10px;color:var(--t3);margin-top:2px">🏎️ ${fantPts} + 🔮 ${predPts}</div>` : ''}
          </div>
          <div style="text-align:right">
            <div class="lbpts" style="${pts ? '' : 'color:var(--t3)'}">${pts || '—'}</div>
            <div class="lbptsl">${pts ? 'pts' : 'no team'}</div>
          </div>
        </div>`;
        }).join('');
    }

    async function showGPBreakdown(raceId) {
      const race = CALENDAR_2026.find(r => r.id === raceId);
      const [{ data: team }, { data: pred }, { data: res }] = await Promise.all([
        sb.from('fantasy_teams').select('*').eq('user_id', currentUser.id).eq('race_id', raceId).maybeSingle(),
        sb.from('predictions').select('*').eq('user_id', currentUser.id).eq('race_id', raceId).maybeSingle(),
        sb.from('race_results').select('*').eq('race_id', raceId).maybeSingle()
      ]);
      if (!res) { showToast('❌ Nessun risultato per questo GP', 'err'); return; }
      const { total: fPts, breakdown: fBrk } = calcFantasyPts(team, res, false);
      const { total: pPts, breakdown: pBrk } = calcPredPts(pred, res, false);
      const total = fPts + pPts;

      const c = document.getElementById('mcontent');
      document.getElementById('moverlay').classList.remove('hidden');
      c.innerHTML = `<span class="mclose" onclick="closeMod()">✕</span>
    <div class="mtitle">${race?.flag} ${race?.name} · <span style="color:var(--red)">${total} pts</span></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div style="background:#001a0a;border:1px solid #003a18;border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:1px">🏎️ Fantasy</div>
        <div style="font-family:'Exo 2',sans-serif;font-weight:900;font-size:26px;color:var(--green)">${fPts}</div>
      </div>
      <div style="background:#1a0a30;border:1px solid #4a1a80;border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:1px">🔮 Pronostici</div>
        <div style="font-family:'Exo 2',sans-serif;font-weight:900;font-size:26px;color:var(--purple)">${pPts}</div>
      </div>
    </div>
    ${fBrk.length ? `<div class="stitle">🏎️ Dettaglio Fantasy</div>
    ${fBrk.map(b => `<div class="score-row"><span>${b.label}</span><span class="${b.pts >= 0 ? 'pts-pos' : 'pts-neg'}">${b.pts >= 0 ? '+' : ''}${b.pts}</span></div>`).join('')}` : ''}
    ${pBrk.length ? `<div class="stitle" style="margin-top:12px">🔮 Dettaglio Pronostici</div>
    ${pBrk.map(b => `<div class="score-row"><span>${b.label}</span><span class="${b.pts >= 0 ? 'pts-pos' : 'pts-neg'}">${b.pts >= 0 ? '+' : ''}${b.pts}</span></div>`).join('')}` : ''}
    <div style="margin-top:12px;padding:10px;background:var(--s2);border-radius:8px;font-size:10px;color:var(--t3)">
      🔢 Risultati: ${res.p1 || '?'} · ${res.p2 || '?'} · ${res.p3 || '?'} · FL: ${res.fastest || '?'} · SC: ${res.sc_count || 0}
    </div>`;
    }
