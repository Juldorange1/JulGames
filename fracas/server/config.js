'use strict';
// Configuration du serveur de jeu : tout passe par des variables d'environnement (voir .env.example).

function int(name, def) { const v = parseInt(process.env[name], 10); return Number.isFinite(v) ? v : def; }
function list(name) { return (process.env[name] || '').split(',').map((s) => s.trim()).filter(Boolean); }

module.exports = {
  HOST: process.env.HOST || '0.0.0.0',
  PORT: int('PORT', 8787),
  // Origines web autorisees (ex : https://juldorange1.github.io). Vide = toutes (developpement).
  ALLOWED_ORIGINS: list('ALLOWED_ORIGINS'),
  MAX_LOBBIES: int('MAX_LOBBIES', 500),
  MAX_CONNECTIONS: int('MAX_CONNECTIONS', 2000),
  MAX_MESSAGE_BYTES: int('MAX_MESSAGE_BYTES', 16 * 1024),
  MAX_MESSAGES_PER_SEC: int('MAX_MESSAGES_PER_SEC', 240),
  // Developpement uniquement : latence artificielle (ms, dans chaque sens) pour tester la
  // prediction/interpolation comme sur Internet. 0 en production.
  DEV_LAG_MS: int('DEV_LAG_MS', 0),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  // Developpement / tests uniquement : remplace des reglages de js/mp/mp_shared.js (objet MP),
  // ex. MP_OVERRIDES='{"ROUND_TIME":20}'. Ne jamais l'utiliser en production.
  MP_OVERRIDES: (() => { try { return process.env.MP_OVERRIDES ? JSON.parse(process.env.MP_OVERRIDES) : null; } catch (e) { return null; } })(),
};
