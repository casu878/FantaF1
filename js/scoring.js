// ══════════════════ CALCOLO PUNTI AVANZATO ══════════════════

    function calcFantasyPts(team, result, noNegative, powerups) {
      if (!team || !result) return { total: 0, breakdown: [] };
      const breakdown = [];
      let total = 0;
      const raceOrder = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];
      // Full race points table per regolamento 2026
      const RACE_FULL = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 };
      // Qualifiche per regolamento: 1°=10, 2°=9, 3°=8, 4°=7 ... 10°=1, 11°-20°=0
      const QUAL_FULL = { 1: 10, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1 };
      const SPRINT_FULL = { 1: 8, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1 };

      const qualOrder = ['pole', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'].map((_, i) => result['qual_p' + (i + 1)]).filter(Boolean);

      [team.driver1, team.driver2, team.driver3].forEach(dName => {
        if (!dName) return;
        let dPts = 0;
        const label = dName.split(' ').pop();

        const dnfList = (result.dnf_drivers || '').split(',').map(x => x.trim()).filter(Boolean);
        const dnqList = (result.dnq_drivers || '').split(',').map(x => x.trim()).filter(Boolean);
        const dsqList = (result.dsq_drivers || '').split(',').map(x => x.trim()).filter(Boolean);
        const penList = (result.penalty_drivers || '').split(',').map(x => x.trim()).filter(Boolean);
        const isDNF = dnfList.includes(dName) || dsqList.includes(dName);

        // ── QUALIFICHE (nuove regole 2026) ──
        // Q2: +5cr +3pts, Q3: +10cr +5pts, Pole: +15cr +7pts
        // Usiamo QUAL_FULL come punti per posizione nelle old rule, ma adesso:
        // Q3 positions (P1-P10)
        const qualQOrder = ['qual_p1', 'qual_p2', 'qual_p3', 'qual_p4', 'qual_p5', 'qual_p6', 'qual_p7', 'qual_p8', 'qual_p9', 'qual_p10'];
        const qPos = qualQOrder.findIndex(k => result[k] === dName) + 1; // 1-based, 0 if not found
        // Q2 positions (P11-P15) — stored in q2_p11..q2_p15
        const q2Order = ['q2_p11','q2_p12','q2_p13','q2_p14','q2_p15'];
        const isQ2only = q2Order.some(k => result[k] === dName);
        // Q1 positions (P16-P20) — stored in q1_p16..q1_p20 or q2_drivers list
        const q1Order = ['q1_p16','q1_p17','q1_p18','q1_p19','q1_p20'];
        const isQ1only = q1Order.some(k => result[k] === dName);
        // Legacy fallback: q2_drivers comma list
        const q2LegacyList = (result.q2_drivers || '').split(',').map(x => x.trim()).filter(Boolean);
        const isPole = result.pole === dName || qPos === 1;
        const isQ3 = qPos >= 1 && qPos <= 10;
        const isQ2 = isQ2only || q2LegacyList.includes(dName);

        if (isPole) {
          dPts += 7; breakdown.push({ label: label + ' POLE (+7pts)', pts: 7 });
        } else if (isQ3) {
          dPts += 5; breakdown.push({ label: label + ' Q3 P' + qPos + ' (+5pts)', pts: 5 });
        } else if (isQ2) {
          dPts += 3; breakdown.push({ label: label + ' Q2 (+3pts)', pts: 3 });
        } else if (isQ1only) {
          // Q1 eliminated: 0 pts, no bonus
        } else if (result.pole === dName && !qPos) {
          // pole stored but no qual order
          dPts += 7; breakdown.push({ label: label + ' Pole (+7pts)', pts: 7 });
        }
        // NC/DSQ quali
        if (dnqList.includes(dName)) {
          const mal = noNegative ? 0 : -5;
          if (!noNegative) { dPts += mal; breakdown.push({ label: `${label} NC/DSQ qual`, pts: mal }); }
        }

        // ── GARA ──
        const racePos = raceOrder.findIndex(k => result[k] === dName) + 1;
        if (racePos > 0 && RACE_FULL[racePos]) {
          const p = RACE_FULL[racePos];
          dPts += p;
          breakdown.push({ label: `${label} P${racePos} gara`, pts: p });
        }

        // Giro veloce gara → +10 regolamento
        if (result.fastest === dName) { dPts += 10; breakdown.push({ label: `${label} Giro Veloce`, pts: 10 }); }

        // Driver of the Day → +10
        if (result.dotd === dName) { dPts += 10; breakdown.push({ label: `${label} DOTD`, pts: 10 }); }

        // Posizioni guadagnate/perse
        if (result.grid_positions) {
          const startPos = result.grid_positions[dName] || (result.pit_lane_start && result.pit_lane_start.includes(dName) ? 21 : 20);
          const endPos = racePos || 20;
          if (!isDNF) {
            const gain = startPos - endPos;
            if (gain > 0) { dPts += gain; breakdown.push({ label: `${label} +${gain} pos`, pts: gain }); }
            else if (gain < 0 && !noNegative) { dPts += gain; breakdown.push({ label: `${label} ${gain} pos`, pts: gain }); }
          }
        }

        // Sorpassi → +1 ciascuno
        if (result.overtakes && result.overtakes[dName]) {
          const ov = result.overtakes[dName];
          if (ov > 0) { dPts += ov; breakdown.push({ label: `${label} ${ov} sorpassi`, pts: ov }); }
        }

        // DNF → -10 pts (regolamento 2026)
        if (dnfList.includes(dName)) {
          if (!noNegative) { dPts -= 10; breakdown.push({ label: `${label} DNF`, pts: -10 }); }
          else { breakdown.push({ label: `${label} DNF (annullato)`, pts: 0 }); }
        }
        // DSQ gara → -20 pts
        if (dsqList.includes(dName)) {
          if (!noNegative) { dPts -= 20; breakdown.push({ label: `${label} DSQ`, pts: -20 }); }
        }
        // Penalità → -8 pts (regolamento 2026)
        if (penList.includes(dName)) {
          if (!noNegative) { dPts -= 8; breakdown.push({ label: `${label} Penalità`, pts: -8 }); }
        }

        // ── SPRINT (se presente) ──
        if (result.sprint_order) {
          const sprOrder = ['sprint_p1', 'sprint_p2', 'sprint_p3', 'sprint_p4', 'sprint_p5', 'sprint_p6', 'sprint_p7', 'sprint_p8'];
          const sprPos = sprOrder.findIndex(k => result[k] === dName) + 1;
          if (!sprPos && result.sprint_win === dName) {
            dPts += SPRINT_FULL[1]; breakdown.push({ label: `${label} Sprint P1`, pts: SPRINT_FULL[1] });
          } else if (sprPos > 0 && SPRINT_FULL[sprPos]) {
            dPts += SPRINT_FULL[sprPos]; breakdown.push({ label: `${label} Sprint P${sprPos}`, pts: SPRINT_FULL[sprPos] });
          }
          // Giro veloce sprint → +5
          if (result.sprint_fastest === dName) { dPts += 5; breakdown.push({ label: `${label} Sprint Giro Veloce`, pts: 5 }); }
          // Sprint posizioni guadagnate
          if (result.sprint_grid) {
            const spStart = result.sprint_grid[dName] || 20;
            const spEnd = sprPos || 20;
            const spGain = spStart - spEnd;
            if (spGain > 0) { dPts += spGain; breakdown.push({ label: `${label} Sprint +${spGain}`, pts: spGain }); }
            else if (spGain < 0 && !noNegative) { dPts += spGain; breakdown.push({ label: `${label} Sprint ${spGain}`, pts: spGain }); }
          }
          // Sorpassi sprint
          if (result.sprint_overtakes && result.sprint_overtakes[dName]) {
            const ov = result.sprint_overtakes[dName];
            if (ov > 0) { dPts += ov; breakdown.push({ label: `${label} Sprint ${ov} sorpassi`, pts: ov }); }
          }
          // Sprint DNF
          const sDnfList = (result.sprint_dnf_drivers || '').split(',').map(x => x.trim()).filter(Boolean);
          if (sDnfList.includes(dName)) {
            if (!noNegative) { dPts -= 10; breakdown.push({ label: `${label} Sprint DNF`, pts: -10 }); }
          }
        }

        // Pit stop bonus/malus (costruttori, ma applicato anche al pilota per la durata)
        if (result.pit_times && result.pit_times[dName]) {
          const pits = Array.isArray(result.pit_times[dName]) ? result.pit_times[dName] : [result.pit_times[dName]];
          pits.forEach(dur => {
            let pb = 0;
            if (dur < 2.0) pb = 20;
            else if (dur < 2.2) pb = 10;
            else if (dur < 2.5) pb = 5;
            else if (dur < 3.0) pb = 2;
            if (pb > 0) { dPts += pb; breakdown.push({ label: `${label} Pit ${dur.toFixed(2)}s`, pts: pb }); }
          });
        }

        // Underdog bonus
        const driverData = DRIVERS_2026.find(x => x.name === dName);
        if (driverData && driverData.price <= 15) {
          const rp = ['p1', 'p2', 'p3', 'p4', 'p5'].findIndex(k => result[k] === dName) + 1;
          if (rp > 0 && rp <= 5) {
            dPts += 8; breakdown.push({ label: `🔥 Underdog ${label} Top5!`, pts: 8 });
          }
        }

        // ── PODIO BONUS (+5pts aggiuntivi, +12cr gestiti dall'economia) ──
        if (racePos >= 1 && racePos <= 3) {
          dPts += 5; breakdown.push({ label: `${label} Podio +5pts aggiuntivi`, pts: 5 });
        }

        total += dPts;
      });

      // ── SCUDERIA ──
      [team.team1, team.team2].forEach(tName => {
        if (!tName) return;
        const tDrivers = DRIVERS_2026.filter(d => d.team === tName).map(d => d.name);
        const top10 = [result.p1, result.p2, result.p3, result.p4, result.p5, result.p6, result.p7, result.p8, result.p9, result.p10].filter(Boolean);
        const dnfList = (result.dnf_drivers || '').split(',').map(x => x.trim()).filter(Boolean);
        const teamMult = powerups?.doubleTeam ? 2 : 1;

        tDrivers.forEach(dName => {
          // Ogni pilota in top10 → +5pts
          const pos = top10.indexOf(dName) + 1;
          if (pos > 0) {
            const tPts = 5 * teamMult; total += tPts; breakdown.push({ label: `${tName} ${dName.split(' ').pop()} top10`, pts: tPts });
          }
          // Posizioni guadagnate/perse per scuderia
          if (result.grid_positions) {
            const startPos = result.grid_positions[dName] || 20;
            const endPos = pos || 20;
            const gain = startPos - endPos;
            const isDNF = dnfList.includes(dName);
            if (!isDNF) {
              if (gain > 0) { const g = gain * teamMult; total += g; breakdown.push({ label: `${tName} ${dName.split(' ').pop()} +${gain} pos${teamMult > 1 ? ' ×2' : ''}`, pts: g }); }
              else if (gain < 0 && !noNegative) { total += gain; breakdown.push({ label: `${tName} ${dName.split(' ').pop()} ${gain} pos`, pts: gain }); }
            }
          }
          // DNF scuderia → -5pts per pilota
          if (dnfList.includes(dName)) {
            if (!noNegative) { total -= 5; breakdown.push({ label: `${tName} ${dName.split(' ').pop()} DNF`, pts: -5 }); }
          }
        });
      });

      // Budget Master
      if (team.budget_used && team.budget_used <= 85) {
        total += 5;
        breakdown.push({ label: 'Budget Master', pts: 5 });
      }

      // Rotazione violata → -30
      if (team.rotation_violated) {
        total -= 30;
        breakdown.push({ label: '❌ Rotazione violata', pts: -30 });
      }

      // ⚡ Turbo Weekend ×1.5
      if (powerups?.turboFantasy) {
        const turboBonus = Math.round(total * 0.5);
        breakdown.push({ label: '⚡ Turbo Weekend ×1.5', pts: turboBonus });
        total = Math.round(total * 1.5);
      }

      return { total, breakdown };
    }

    function calcPredPts(pred, result, doubleWeekend, powerups) {
      if (!pred || !result) return { total: 0, breakdown: [], credits: 0 };
      let pts = 0;
      let credits = 0;
      const breakdown = [];
      const podium = [result.p1, result.p2, result.p3];
      const top10 = [result.p1, result.p2, result.p3, result.p4, result.p5, result.p6, result.p7, result.p8, result.p9, result.p10].filter(Boolean);

      // ── POLE POSITION ──
      if (pred.pole) {
        if (pred.pole === result.pole) {
          pts += PRED.pole_exact; credits += PRED_CR.pole_correct;
          breakdown.push({ label: 'Pole esatta', pts: PRED.pole_exact, cr: PRED_CR.pole_correct });
        } else if (podium.includes(pred.pole)) {
          pts += PRED.pole_top3;
          breakdown.push({ label: 'Pole in top3', pts: PRED.pole_top3, cr: 0 });
        }
      }

      // ── PRIMA FILA ──
      let filaOk = 0;
      if (pred.fila1 && (pred.fila1 === result.pole || pred.fila1 === result.p2_qual)) filaOk++;
      if (pred.fila2 && (pred.fila2 === result.pole || pred.fila2 === result.p2_qual)) filaOk++;
      if (filaOk === 2) { pts += 8; breakdown.push({ label: 'Prima fila completa', pts: 8, cr: 0 }); }
      else if (filaOk === 1) { pts += 3; breakdown.push({ label: 'Prima fila 1/2', pts: 3, cr: 0 }); }

      // ── VINCITORE GARA (p1) ──
      if (pred.p1) {
        if (pred.p1 === result.p1) {
          pts += PRED.win_exact; credits += PRED_CR.win_exact;
          breakdown.push({ label: '🥇 Vincitore esatto', pts: PRED.win_exact, cr: PRED_CR.win_exact });
        } else if (podium.includes(pred.p1)) {
          pts += PRED.win_podium;
          breakdown.push({ label: '🥇 Vincitore nel podio', pts: PRED.win_podium, cr: 0 });
        }
      }

      // ── PODIO P2/P3 ──
      ['p2', 'p3'].forEach((k, i) => {
        const labels = ['🥈 P2', '🥉 P3'];
        if (!pred[k]) return;
        if (pred[k] === result[k]) {
          pts += PRED.pos_exact; credits += PRED_CR.podium_exact;
          breakdown.push({ label: labels[i] + ' posizione esatta', pts: PRED.pos_exact, cr: PRED_CR.podium_exact });
        } else if (podium.includes(pred[k])) {
          pts += PRED.pos_in_podium; credits += PRED_CR.podium_wrong_pos;
          breakdown.push({ label: labels[i] + ' nel podio', pts: PRED.pos_in_podium, cr: PRED_CR.podium_wrong_pos });
        }
      });

      // ── TOP 10 (posizioni 4-10) ──
      const top10keys = ['p4', 'p5', 'top6', 'top7', 'top8', 'top9', 'top10'];
      const top10real = [result.p4, result.p5, result.p6, result.p7, result.p8, result.p9, result.p10].filter(Boolean);
      top10keys.forEach(k => {
        if (!pred[k]) return;
        if (top10real.includes(pred[k])) {
          pts += PRED.top10_correct; credits += PRED_CR.top10_correct;
          breakdown.push({ label: `Top10 corretto (${pred[k].split(' ').pop()})`, pts: PRED.top10_correct, cr: PRED_CR.top10_correct });
        }
      });

      // ── FASTEST PIT STOP ──
      if (pred.fastest_pit_team && result.fastest_pit_team) {
        if (pred.fastest_pit_team === result.fastest_pit_team) {
          pts += PRED.fastest_pit; credits += PRED_CR.fastest_pit;
          breakdown.push({ label: 'Prima scuderia pit stop', pts: PRED.fastest_pit, cr: PRED_CR.fastest_pit });
        }
      }

      // ── GIRO VELOCE ──
      if (pred.fastest_lap && result.fastest) {
        if (pred.fastest_lap === result.fastest) {
          pts += PRED.fastest; credits += PRED_CR.fastest_lap;
          breakdown.push({ label: 'Giro veloce corretto', pts: PRED.fastest, cr: PRED_CR.fastest_lap });
        }
      }

      // ── MIGLIOR RIMONTA ──
      if (pred.best_comeback && result.best_comeback) {
        if (pred.best_comeback === result.best_comeback) {
          pts += PRED.best_comeback; credits += PRED_CR.best_comeback;
          breakdown.push({ label: 'Miglior Rimonta corretta', pts: PRED.best_comeback, cr: PRED_CR.best_comeback });
        }
      }

      // ── PRIMO DNF ──
      if (pred.first_dnf && result.first_dnf) {
        if (pred.first_dnf === result.first_dnf) {
          pts += PRED.first_dnf;
          breakdown.push({ label: '🚫 Primo DNF corretto', pts: PRED.first_dnf, cr: 0 });
        }
      }

      // ── SAFETY CAR ──
      if (pred.sc_yn !== null && pred.sc_yn !== undefined && result.sc_count !== undefined) {
        const actualSC = result.sc_count > 0;
        if (pred.sc_yn === actualSC) {
          pts += PRED.sc_exact; credits += PRED_CR.sc_correct;
          breakdown.push({ label: 'Safety Car corretta', pts: PRED.sc_exact, cr: PRED_CR.sc_correct });
        }
      }

      // ── BANDIERA ROSSA ──
      if (pred.rf_yn !== null && pred.rf_yn !== undefined && result.rf !== undefined) {
        if (pred.rf_yn === result.rf) {
          pts += PRED.rf_exact; credits += PRED_CR.rf_correct;
          breakdown.push({ label: 'Bandiera Rossa corretta', pts: PRED.rf_exact, cr: PRED_CR.rf_correct });
        }
      }

      // ── TOTALE RITIRI ──
      if (pred.retires !== undefined && result.retires_count !== undefined) {
        const diff = Math.abs((pred.retires || 0) - (result.retires_count || 0));
        if (diff === 0) {
          pts += PRED.retires_exact; credits += PRED_CR.retires_exact;
          breakdown.push({ label: 'N° ritiri esatto', pts: PRED.retires_exact, cr: PRED_CR.retires_exact });
        } else if (diff === 1) {
          pts += PRED.retires_close; credits += PRED_CR.retires_close;
          breakdown.push({ label: 'N° ritiri ±1', pts: PRED.retires_close, cr: PRED_CR.retires_close });
        }
      }

      // ── COSTRUTTORE PIÙ PERFORMANTE ──
      if (pred.constructor_best && result.constructor_best) {
        if (pred.constructor_best === result.constructor_best) {
          pts += PRED.constructor_perf; credits += PRED_CR.constructor_perf;
          breakdown.push({ label: 'Costruttore performante', pts: PRED.constructor_perf, cr: PRED_CR.constructor_perf });
        }
      }

      // ── MIGLIOR RISULTATO WEEKEND ──
      const bestWeekend = result.best_result || result.best_weekend_driver || null;
      if (pred.grid_best && bestWeekend) {
        if (pred.grid_best === bestWeekend) {
          pts += PRED.grid_best_weekend;
          breakdown.push({ label: 'Miglior Weekend', pts: PRED.grid_best_weekend, cr: 0 });
        }
      }

      // ── SPRINT ──
      if (pred.sprint_win && result.sprint_win) {
        if (pred.sprint_win === result.sprint_win) {
          pts += 8; breakdown.push({ label: 'Sprint vincitore', pts: 8, cr: 0 });
        } else {
          const sprintPodium = [result.sprint_win, result.sprint_p2, result.sprint_p3].filter(Boolean);
          if (sprintPodium.includes(pred.sprint_win)) {
            pts += 3; breakdown.push({ label: 'Sprint vincitore nel podio sprint', pts: 3, cr: 0 });
          }
        }
      }
      if (pred.sprint_p2 && result.sprint_p2) {
        if (pred.sprint_p2 === result.sprint_p2) { pts += 5; breakdown.push({ label: 'Sprint P2 esatto', pts: 5, cr: 0 }); }
        else { const sp = [result.sprint_win, result.sprint_p2, result.sprint_p3].filter(Boolean); if (sp.includes(pred.sprint_p2)) { pts += 2; breakdown.push({ label: 'Sprint P2 nel podio', pts: 2, cr: 0 }); } }
      }
      if (pred.sprint_p3 && result.sprint_p3) {
        if (pred.sprint_p3 === result.sprint_p3) { pts += 5; breakdown.push({ label: 'Sprint P3 esatto', pts: 5, cr: 0 }); }
        else { const sp = [result.sprint_win, result.sprint_p2, result.sprint_p3].filter(Boolean); if (sp.includes(pred.sprint_p3)) { pts += 2; breakdown.push({ label: 'Sprint P3 nel podio', pts: 2, cr: 0 }); } }
      }

      // ── PERFECT WEEKEND ──
      const isPerfect = pred.pole === result.pole && pred.p1 === result.p1 && pred.p2 === result.p2 && pred.p3 === result.p3 && pred.sc_yn === (result.sc_count > 0);
      if (isPerfect) {
        const isSuperPerfect = isPerfect && Math.abs((pred.retires || 0) - (result.retires_count || 0)) === 0;
        if (isSuperPerfect) { pts += PRED.super_perfect; breakdown.push({ label: '🌟 SUPER PERFECT!', pts: PRED.super_perfect, cr: 0 }); }
        else { pts += PRED.perfect; breakdown.push({ label: '🎯 Perfect Weekend!', pts: PRED.perfect, cr: 0 }); }
      }

      // 🎯 Occhio di Falco: +5pts per ogni voce breakdown esatta (label non contiene 'errore')
      if (powerups?.eagleBonus) {
        const exactCount = breakdown.filter(b => b.pts > 0).length;
        if (exactCount > 0) {
          const eagleBonus = exactCount * 5;
          breakdown.push({ label: `🎯 Occhio di Falco (${exactCount}×+5)`, pts: eagleBonus, cr: 0 });
          pts += eagleBonus;
        }
      }

      // 💣 Doppia Posta: pronostici ×2
      if (powerups?.doublePred || doubleWeekend) {
        const doubled = pts;
        breakdown.push({ label: '💣 Doppia Posta ×2', pts: doubled, cr: 0 });
        pts *= 2;
      }

      return { total: pts, breakdown, credits };
    }


    function calcTotalPts(fantasyTeam, prediction, result, powerups) {
      if (!result) return 0;
      const pu = powerups || {};
      const f = calcFantasyPts(fantasyTeam, result, pu.noNegative || false, pu);
      const p = calcPredPts(prediction, result, pu.doublePred || false, pu);
      return f.total + p.total;
    }
