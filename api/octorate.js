// Lit les réservations Octorate (lecture seule) pour les chambres, le ménage et le planning.
// Variables Vercel : OCTORATE_CLIENT_ID, OCTORATE_CLIENT_SECRET, et OCTORATE_REFRESH_TOKEN si l'accès
// a été donné par autorisation (OAuth). STAFF_PIN (facultatif) protège les noms des clients.
// Seuls les champs utiles à l'équipe sortent d'ici : jamais les notes privées ni les données de paiement.
const PROPERTY = '498417';
const BASE = 'https://api.octorate.com/connect/rest/v1';
// Chambres PMS Octorate -> nom de la chambre dans l'appli
const ROOMS = {
  385377: 'Ariane', 939467: 'Ariane', 385378: 'Bambou', 939468: 'Bambou', 385393: 'Cannelle', 385396: 'Blanche',
  385398: 'Joséphine', 385397: 'Anyssates', 385399: 'Agafay', 385395: 'Victoire', 385394: 'Sarah',
  389643: '*' // EXCLUSIVITE : tout le riad
};
const PAYS = { FR: 'France', BE: 'Belgique', CH: 'Suisse', DE: 'Allemagne', IT: 'Italie', ES: 'Espagne', GB: 'Royaume-Uni', UK: 'Royaume-Uni', US: 'États-Unis', CA: 'Canada', NL: 'Pays-Bas', PT: 'Portugal', MA: 'Maroc', JP: 'Japon', LU: 'Luxembourg', IE: 'Irlande', AT: 'Autriche', SE: 'Suède', NO: 'Norvège', DK: 'Danemark', AU: 'Australie', BR: 'Brésil' };

let cached = null; // { token, exp }

async function getToken() {
  if (cached && cached.exp > Date.now() + 60e3) return cached.token;
  const id = process.env.OCTORATE_CLIENT_ID, secret = process.env.OCTORATE_CLIENT_SECRET;
  const refresh = process.env.OCTORATE_REFRESH_TOKEN;
  const body = new URLSearchParams({ client_id: id, client_secret: secret });
  if (refresh) body.set('refresh_token', refresh);
  const r = await fetch(BASE + (refresh ? '/identity/refresh' : '/identity/apilogin'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body
  });
  if (!r.ok) throw Object.assign(new Error('auth'), { status: r.status });
  const j = await r.json();
  const exp = j.expireDate ? Date.parse(String(j.expireDate).replace(/\[.*\]$/, '')) : NaN;
  cached = { token: j.access_token, exp: isNaN(exp) ? Date.now() + 30 * 60e3 : exp };
  return cached.token;
}

function ymd(d) { return d.toLocaleDateString('sv-SE', { timeZone: 'Africa/Casablanca' }); }

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.OCTORATE_CLIENT_ID || !process.env.OCTORATE_CLIENT_SECRET) return res.status(500).json({ error: 'config' });
  if (process.env.STAFF_PIN && req.headers['x-staff-pin'] !== process.env.STAFF_PIN) return res.status(401).json({ error: 'pin' });

  const from = ymd(new Date(Date.now() - 864e5));
  const to = ymd(new Date(Date.now() + 15 * 864e5));
  try {
    const token = await getToken();
    const all = [];
    for (let page = 0; page < 10; page++) {
      const q = new URLSearchParams({ startDate: from, endDate: to, type: 'STAY', size: '100', page: String(page) });
      const r = await fetch(BASE + '/reservation/' + PROPERTY + '?' + q, { headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' } });
      if (r.status === 401) cached = null;
      if (!r.ok) return res.status(502).json({ error: 'octorate', status: r.status });
      const j = await r.json();
      all.push(...(j.data || []));
      if (!j.page || page + 1 >= (j.page.totalPages || 0)) break;
    }
    const stays = all
      .filter(b => b && !['CANCELLED', 'NOROOM', 'PROPOSAL', 'PROPOSAL_EXPIRED'].includes(b.status))
      .filter(b => ROOMS[b.pmsProduct])
      .map(b => {
        const booker = (b.guests || []).find(g => g.type === 'BOOKER') || {};
        const nat = booker.nationality || booker.country || '';
        return {
          id: b.id,
          room: ROOMS[b.pmsProduct],
          arr: String(b.checkin || '').slice(0, 10),
          dep: String(b.checkout || '').slice(0, 10),
          time: b.arrivalTime || '',
          guest: [b.firstName, b.lastName].filter(Boolean).join(' ') || 'Client',
          pax: b.totalGuest || 1,
          children: (b.totalChildren || 0) + (b.totalInfants || 0),
          pays: PAYS[nat] || nat
        };
      })
      .sort((a, b) => a.arr.localeCompare(b.arr));
    return res.status(200).json({ stays, today: ymd(new Date()) });
  } catch (e) {
    return res.status(502).json({ error: e.message === 'auth' ? 'auth' : 'fetch', status: e.status });
  }
};
