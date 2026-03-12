    // ══════════════════ BOOT ══════════════════

    async function init() {
      try {
        sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        await loadDynamicPrices();
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user) { await loadUserProfile(session.user); showApp(); }
        else showAuth();
        sb.auth.onAuthStateChange(async (ev, sess) => {
          if ((ev === 'SIGNED_IN' || ev === 'TOKEN_REFRESHED') && sess?.user) { await loadUserProfile(sess.user); showApp(); }
          else if (ev === 'SIGNED_OUT') { currentUser = null; currentProfile = null; showAuth(); }
        });
      } catch (e) { console.error(e); showAuth(); }
    }

    async function loadDynamicPrices() {
      try {
        const { data } = await sb.from('driver_prices').select('*');
        if (data && data.length > 0) {
          data.forEach(row => {
            if (row.driver_name.startsWith('TEAM:')) {
              const teamName = row.driver_name.replace('TEAM:', '');
              if (TEAM_PRICES_2026[teamName] !== undefined) TEAM_PRICES_2026[teamName] = row.price;
            } else {
              const d = DRIVERS_2026.find(x => x.name === row.driver_name);
              if (d) d.price = row.price;
            }
          });
        }
      } catch (e) { }
    }

    function hideSplash() { document.getElementById('splash').style.display = 'none'; }
    function showAuth() {
      hideSplash();
      document.getElementById('auth').style.display = 'flex';
      document.getElementById('app').style.display = 'none';
    }
    function showApp() {
      hideSplash();
      document.getElementById('auth').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      document.querySelectorAll('.page').forEach(el => el.classList.remove('on'));
      document.getElementById('pg-home').classList.add('on');
      document.querySelectorAll('.ni').forEach(n => n.classList.remove('on'));
      document.getElementById('ni-home').classList.add('on');
      initApp().catch(console.error);
    }

    async function loadUserProfile(user) {
      currentUser = user;
      const { data } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (data) { currentProfile = data; return; }
      const colors = ['#E10600', '#3671C6', '#27F4D2', '#FF8000', '#358C75', '#FF87BC', '#64C4FF', '#B6BABD', '#b44fff', '#ffd700'];
      const emojis = ['🏎️', '⚡', '🔥', '🏆', '⭐', '🚀', '💎', '🎯', '🦊', '👑'];
      const { count } = await sb.from('profiles').select('*', { count: 'exact', head: true });
      const idx = count || 0;
      const meta = user.user_metadata || {};
      const newP = {
        id: user.id,
        nickname: meta.nickname || user.email.split('@')[0],
        role: idx === 0 ? 'admin' : (meta.role || 'user'),
        avatar: meta.avatar || emojis[idx % emojis.length],
        color: meta.color || colors[idx % colors.length],
        total_pts: 0, gps_done: 0
      };
      const { data: created } = await sb.from('profiles').insert(newP).select().single();
      currentProfile = created || newP;
    }

    // ══════════════════ AUTH UI ══════════════════

    function swAuth(t) {
      document.querySelectorAll('.atab').forEach((el, i) => el.classList.toggle('on', i === (t === 'login' ? 0 : 1)));
      document.getElementById('lform').classList.toggle('hidden', t !== 'login');
      document.getElementById('rform').classList.toggle('hidden', t === 'login');
      if (t === 'reg') {
        document.getElementById('reg-inputs').classList.remove('hidden');
        document.getElementById('email-confirm-msg').classList.add('hidden');
      }
    }

    async function doLogin() {
      const email = document.getElementById('lemail').value.trim();
      const pass = document.getElementById('lpass').value;
      const err = document.getElementById('lerr');
      err.textContent = '';
      if (!email || !pass) { err.textContent = '❌ Compila tutti i campi'; return; }
      const btn = document.getElementById('login-btn');
      btn.textContent = '...'; btn.disabled = true;
      const { error } = await sb.auth.signInWithPassword({ email, password: pass });
      btn.textContent = 'Entra →'; btn.disabled = false;
      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) err.textContent = '⚠️ Email non confermata';
        else if (error.message.toLowerCase().includes('invalid')) err.textContent = '❌ Email o password errati';
        else err.textContent = '❌ ' + error.message;
      }
    }

    async function doRegister() {
      const nick = document.getElementById('rnick').value.trim().replace(/\s+/g, '_');
      const email = document.getElementById('remail').value.trim();
      const pass = document.getElementById('rpass').value;
      const code = document.getElementById('rcode').value.trim();
      const err = document.getElementById('rerr');
      err.textContent = ''; err.className = 'errmsg err';
      if (nick.length < 3) { err.textContent = '❌ Nickname minimo 3 caratteri'; return; }
      if (!/^[a-zA-Z0-9_]+$/.test(nick)) { err.textContent = '❌ Solo lettere, numeri e _'; return; }
      if (!email || !email.includes('@')) { err.textContent = '❌ Email non valida'; return; }
      if (pass.length < 6) { err.textContent = '❌ Password minimo 6 caratteri'; return; }
      if (code !== LEAGUE_CODE) { err.textContent = '❌ Codice lega errato'; return; }
      const { data: ex } = await sb.from('profiles').select('id').eq('nickname', nick).maybeSingle();
      if (ex) { err.textContent = '❌ Nickname già in uso'; return; }
      const colors = ['#E10600', '#3671C6', '#27F4D2', '#FF8000', '#358C75', '#FF87BC', '#64C4FF', '#B6BABD', '#b44fff', '#ffd700'];
      const emojis = ['🏎️', '⚡', '🔥', '🏆', '⭐', '🚀', '💎', '🎯', '🦊', '👑'];
      const { count } = await sb.from('profiles').select('*', { count: 'exact', head: true });
      const idx = count || 0;
      const profileData = { nickname: nick, role: idx === 0 ? 'admin' : 'user', avatar: emojis[idx % emojis.length], color: colors[idx % colors.length] };
      const btn = document.getElementById('reg-btn');
      btn.textContent = '...'; btn.disabled = true;
      const { data: authData, error: authErr } = await sb.auth.signUp({ email, password: pass, options: { data: profileData } });
      btn.textContent = 'Crea Account →'; btn.disabled = false;
      if (authErr) {
        if (authErr.message.toLowerCase().includes('already registered')) err.textContent = '❌ Email già registrata';
        else err.textContent = '❌ ' + authErr.message;
        return;
      }
      if (authData.session || authData.user?.email_confirmed_at) {
        await sb.from('profiles').upsert({ id: authData.user.id, ...profileData, total_pts: 0, gps_done: 0 }, { onConflict: 'id' });
        showToast('✅ Benvenuto nella Fanta F1!', 'ok');
        await loadUserProfile(authData.user);
        showApp();
        return;
      }
      document.getElementById('reg-inputs').classList.add('hidden');
      document.getElementById('confirm-email-shown').textContent = email;
      document.getElementById('email-confirm-msg').classList.remove('hidden');
    }

    async function doLogout() { await sb.auth.signOut(); }

    // ══════════════════ APP INIT ══════════════════

    async function initApp() {
      const av = document.getElementById('uav');
      if (av && currentProfile) { av.textContent = currentProfile.avatar || '🏎️'; av.style.background = currentProfile.color || 'var(--red)'; }
      const ac = document.getElementById('admin-code');
      if (ac) ac.textContent = LEAGUE_CODE;
      await renderHome();
      startCountdown();
      checkOpenF1Status();
    }

    let _currentPage = null;
    function navTo(p) {
      document.querySelectorAll('.page').forEach(el => el.classList.remove('on'));
      document.getElementById('pg-' + p)?.classList.add('on');
      document.querySelectorAll('.ni').forEach(n => n.classList.remove('on'));
      document.getElementById('ni-' + p)?.classList.add('on');
      const wasAlready = _currentPage === p;
      _currentPage = p;
      // Renderizza sempre stand/predict/home (dati cambiano spesso)
      // Per fantasy/profile usa cache e non re-renderizza se già aperta
      if (p === 'fantasy') { if (!wasAlready) renderFantasy(); showFantasyTab('team'); }
      if (p === 'predict') renderPredict(); // sempre — i lock cambiano in tempo reale
      if (p === 'stand') renderStandings('gen');
      if (p === 'admin') { renderAdminLog(); }
      if (p === 'profile') { if (!wasAlready) renderProfile(); }
      if (p === 'rules') { }
      if (p === 'live') { document.getElementById('ldot').classList.remove('hidden'); initRaceSelector(); }
      else { document.getElementById('ldot').classList.add('hidden'); stopLive(); }
    }

    function showFantasyTab(tab) {
      const isTeam = tab === 'team';
      const isBuste = tab === 'buste';
      document.getElementById('fantasy-content').classList.toggle('hidden', !isTeam);
      document.getElementById('fantasy-market').classList.toggle('hidden', isTeam || isBuste);
      document.getElementById('fantasy-buste').classList.toggle('hidden', !isBuste);
      // Aggiorna stile bottoni
      const btns = { team: 'ftab-team', market: 'ftab-market', buste: 'ftab-buste' };
      Object.entries(btns).forEach(([t, id]) => {
        const b = document.getElementById(id);
        if (!b) return;
        b.className = t === tab ? 'btn btn-r btn-sm' : 'btn btn-g btn-sm';
        if (t === 'buste' && t !== tab) b.style.cssText = 'border-color:rgba(255,165,0,.4);color:#ffaa44';
        else b.style.cssText = '';
      });
      if (isBuste) renderEnvelopeMarket();
      document.getElementById('ftab-team').className = 'btn btn-sm ' + (isTeam ? 'btn-r' : 'btn-g');
      document.getElementById('ftab-market').className = 'btn btn-sm ' + (isTeam ? 'btn-g' : 'btn-r');
      if (!isTeam) renderMarket();
    }

    async function renderMarket() {
      const el = document.getElementById('fantasy-market');
      if (!el) return;
      el.innerHTML = '<div style="color:var(--t3);text-align:center;padding:20px">⏳ Caricamento...</div>';

      const { data: lots } = await sb.from('auction_lots').select('*');
      const { data: users } = await sb.from('profiles').select('id,nickname,avatar,color').order('nickname');

      // Build map: item_name → winner nickname
      const assignedMap = {};
      (lots || []).filter(l => l.status === 'sold' && l.winner_id).forEach(l => {
        const u = (users || []).find(x => x.id === l.winner_id);
        assignedMap[l.item_name] = u ? { nick: u.nickname, av: u.avatar, col: u.color } : null;
      });

      let html = '';

      // ── Scuderie ──
      html += '<div class="stitle">🏎️ Scuderie</div>';
      TEAMS_2026.forEach(t => {
        const owner = assignedMap[t];
        const val = TEAM_PRICES_2026[t] || 0;
        const sal = TEAM_SALARIES_2026[t] || 0;
        const teamDrv = DRIVERS_2026.filter(d => d.team === t);
        html += `<div style="background:var(--s1);border:1px solid ${owner ? 'var(--border)' : '#1a3a20'};border-radius:10px;padding:11px;margin-bottom:7px;display:flex;align-items:center;gap:10px">`;
        html += `<div style="flex:1;min-width:0">`;
        html += `<div style="font-weight:800;font-size:14px">${t}</div>`;
        html += `<div style="font-size:10px;color:var(--t3);margin-top:2px">Val: <span style="color:var(--gold)">${val}cr</span> · Stip: <span style="color:#ff9090">${sal}cr/gara</span></div>`;
        html += `<div style="font-size:10px;color:var(--t3);margin-top:1px">${teamDrv.map(d => d.name.split(' ').pop()).join(' · ')}</div>`;
        html += `</div>`;
        if (owner) {
          html += `<div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:3px">`;
          html += `<div style="display:flex;align-items:center;gap:5px"><div class="av" style="background:${owner.col};width:22px;height:22px;font-size:10px">${owner.av}</div><div style="font-size:11px;font-weight:700;color:var(--t2)">${owner.nick}</div></div>`;
          html += `<div style="font-size:9px;background:#1a0606;color:#ff9090;border:1px solid #3a1010;border-radius:4px;padding:2px 6px">ASSEGNATA</div>`;
          html += `</div>`;
        } else {
          html += `<div style="font-size:9px;background:#001a0a;color:var(--green);border:1px solid #0a3020;border-radius:4px;padding:3px 8px;font-weight:800;letter-spacing:.5px">LIBERA</div>`;
        }
        html += `</div>`;
      });

      // ── Piloti ──
      html += '<div class="stitle" style="margin-top:14px">👤 Piloti</div>';
      DRIVERS_2026.forEach(d => {
        const owner = assignedMap[d.name];
        html += `<div style="background:var(--s1);border:1px solid ${owner ? 'var(--border)' : '#1a3a20'};border-radius:10px;padding:10px;margin-bottom:6px;display:flex;align-items:center;gap:10px">`;
        html += `<div style="width:3px;align-self:stretch;background:#${d.tc};border-radius:2px;flex-shrink:0"></div>`;
        html += `<div style="flex:1;min-width:0">`;
        html += `<div style="font-weight:800;font-size:13px">${d.name}</div>`;
        html += `<div style="font-size:10px;color:var(--t3)">${d.team} · Val: <span style="color:var(--gold)">${d.price}cr</span> · Stip: <span style="color:#ff9090">${d.salary}cr/gara</span></div>`;
        html += `</div>`;
        if (owner) {
          html += `<div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:3px">`;
          html += `<div style="display:flex;align-items:center;gap:5px"><div class="av" style="background:${owner.col};width:22px;height:22px;font-size:10px">${owner.av}</div><div style="font-size:11px;font-weight:700;color:var(--t2)">${owner.nick}</div></div>`;
          html += `<div style="font-size:9px;background:#1a0606;color:#ff9090;border:1px solid #3a1010;border-radius:4px;padding:2px 6px">PRESO</div>`;
          html += `</div>`;
        } else {
          html += `<div style="font-size:9px;background:#001a0a;color:var(--green);border:1px solid #0a3020;border-radius:4px;padding:3px 8px;font-weight:800;letter-spacing:.5px">LIBERO</div>`;
        }
        html += `</div>`;
      });

      el.innerHTML = html;
    }

