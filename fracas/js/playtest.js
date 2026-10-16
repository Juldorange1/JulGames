// Journal de test (playtests, equilibrage) : le jeu note des statistiques LOCALES, sans rien envoyer
// sur Internet. Le testeur peut exporter le journal (Parametres > Test) et l'envoyer au createur.
// Evenements : salle videe (temps, % restant), boss (vaincu / enfui), bonus/malus choisis,
// debut et fin de partie. On garde les PT_MAX derniers evenements.

const PT_MAX = 3000;

const Playtest = {
  roomT0: 0,
  _on: null,
  enabled() {
    if (this._on == null) {
      let on = false;
      try { on = /[?&]playtest\b/.test(location.search); } catch (e) { /* hors navigateur */ }
      if (typeof NATIVE !== 'undefined' && NATIVE && NATIVE.isPlaytest && NATIVE.isPlaytest()) on = true;
      this._on = on;
    }
    return this._on;
  },
  data() {
    if (!Save.data.playtest) Save.data.playtest = { v: 1, events: [] };
    return Save.data.playtest;
  },
  log(type, info) {
    if (!Save.data || !this.enabled()) return; // rien n'est note hors version de test
    const d = this.data();
    d.events.push(Object.assign({ t: Date.now(), type }, info || {}));
    if (d.events.length > PT_MAX) d.events.splice(0, d.events.length - PT_MAX);
  },
  roomStart() { this.roomT0 = performance.now(); },
  secs() { return Math.round((performance.now() - this.roomT0) / 100) / 10; },
  roomEnd(mode, info, player) {
    this.log('room', Object.assign({ mode, secs: this.secs(), pct: player ? Math.round(player.damageMultiplier * 100) : null, char: player && player.character ? player.character.id : null }, info));
  },
  clear() { this.data().events = []; Save.persist(); },

  // Resume lisible + evenements bruts.
  report() {
    const ev = this.data().events;
    const sum = { rooms: 0, bosses: {}, boonsPicked: {}, cursesPicked: {}, byPart: {} };
    for (const e of ev) {
      if (e.type === 'room') {
        sum.rooms++;
        const k = `${e.mode}-partie${e.part}`;
        const p = sum.byPart[k] || (sum.byPart[k] = { rooms: 0, secs: 0, pct: 0 });
        p.rooms++; p.secs += e.secs || 0; p.pct += e.pct || 0;
        if (e.boss) for (const b of e.bossTypes || []) { const s = sum.bosses[b] || (sum.bosses[b] = { won: 0, fled: 0, secs: 0 }); s.won++; s.secs += e.secs || 0; }
      }
      if (e.type === 'bossFled') for (const b of e.bossTypes || []) { const s = sum.bosses[b] || (sum.bosses[b] = { won: 0, fled: 0, secs: 0 }); s.fled++; }
      if (e.type === 'boons') {
        if (e.boon) sum.boonsPicked[e.boon] = (sum.boonsPicked[e.boon] || 0) + 1;
        if (e.curse) sum.cursesPicked[e.curse] = (sum.cursesPicked[e.curse] || 0) + 1;
      }
    }
    for (const p of Object.values(sum.byPart)) { p.secsMoy = +(p.secs / p.rooms).toFixed(1); p.pctMoy = Math.round(p.pct / p.rooms); delete p.secs; delete p.pct; }
    for (const s of Object.values(sum.bosses)) { s.secsMoy = s.won ? +(s.secs / s.won).toFixed(1) : null; delete s.secs; }
    return {
      jeu: 'Fracas', exporte: new Date().toISOString(), langue: Save.data.language,
      programme: !!(typeof NATIVE !== 'undefined' && NATIVE), ecran: `${window.innerWidth}x${window.innerHeight}`,
      resume: sum, evenements: ev,
    };
  },
  export() {
    const name = `fracas-journal-${new Date().toISOString().slice(0, 10)}.json`;
    const text = JSON.stringify(this.report(), null, 1);
    if (typeof NATIVE !== 'undefined' && NATIVE && NATIVE.exportFile) return NATIVE.exportFile(name, text); // programme : dossier Documents
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return name;
  },
};
