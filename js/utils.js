// ══════════════════ CACHE LAYER ══════════════════
    // Evita query ripetute su dati che cambiano raramente
    const _cache = {};
    const CACHE_TTL = 30000; // 30 secondi

    async function cachedQuery(key, fetchFn, ttl = CACHE_TTL) {
      const now = Date.now();
      if (_cache[key] && (now - _cache[key].ts) < ttl) {
        return _cache[key].data;
      }
      const data = await fetchFn();
      _cache[key] = { data, ts: now };
      return data;
    }

    function invalidateCache(key) {
      if (key) delete _cache[key];
      else Object.keys(_cache).forEach(k => delete _cache[k]);
    }

    // ══════════════════ UTILS ══════════════════

    function closeMod() { document.getElementById('moverlay').classList.add('hidden'); stopAuctionRealtime(); }

    function showToast(msg, type = 'ok') {
      const t = document.createElement('div');
      t.className = `toast ${type}`; t.textContent = msg;
      document.getElementById('toasts').appendChild(t);
      setTimeout(() => t.remove(), 3500);
    }

    function fmtIt(iso) {
      return new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
    }
