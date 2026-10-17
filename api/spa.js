// Lit les réservations spa à venir dans Wix Bookings (lecture seule).
// Consultation libre pour l'équipe (pas de code). La clé Wix reste côté serveur.
const SITE_ID = '86293635-9a43-42a1-b451-aae82a117cdb';
const ENDPOINT = 'https://www.wixapis.com/bookings/bookings-reader/v2/extended-bookings/query';

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const key = process.env.WIX_API_KEY;
  if (!key) return res.status(500).json({ error: 'config' });

  const from = new Date(); from.setUTCHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + 14 * 864e5);
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': key, 'wix-site-id': SITE_ID, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: { filter: { startDate: { $gte: from.toISOString() } }, cursorPaging: { limit: 100 } } })
    });
    if (!r.ok) return res.status(502).json({ error: 'wix', status: r.status });
    const data = await r.json();
    const bookings = (data.extendedBookings || [])
      .map(e => e.booking)
      .filter(b => b && !['CANCELED', 'DECLINED'].includes(b.status))
      .filter(b => new Date(b.startDate) < to)
      .map(b => {
        const c = b.contactDetails || {};
        const msg = (b.additionalFields || []).find(f => /message/i.test(f.label || ''));
        return {
          id: b.id,
          start: (b.adjustedStart && b.adjustedStart.localDate) || b.startDate,
          end: (b.adjustedEnd && b.adjustedEnd.localDate) || b.endDate,
          name: (b.bookedEntity && b.bookedEntity.title) || 'Soin',
          guest: [c.firstName, c.lastName ? c.lastName.charAt(0).toUpperCase() + '.' : ''].filter(Boolean).join(' ') || 'Client',
          people: b.totalParticipants || b.numberOfParticipants || 1,
          paid: b.paymentStatus === 'PAID' || b.paymentStatus === 'FULLY_PAID',
          message: msg ? msg.value : ''
        };
      })
      .sort((a, b) => a.start.localeCompare(b.start));
    return res.status(200).json({ bookings });
  } catch (e) {
    return res.status(502).json({ error: 'fetch' });
  }
};
