// Lit les fiches de la base Airtable « PROCÉDURES & MODES D'EMPLOI » (lecture seule).
// Variable Vercel : AIRTABLE_TOKEN (jeton personnel, droit data.records:read sur cette base uniquement).
// En production, seules les fiches « Publiée » sortent ; sur les adresses de test (preview),
// les fiches « À valider » sont aussi montrées, marquées « En relecture », pour pouvoir les vérifier.
const BASE = 'appAOa4JCozWeQwPY';
const TABLE = 'tblX3JDSbCKDDuIhv';
// identifiants des champs (ils ne changent pas si on renomme une colonne dans Airtable)
const F = {
  titre: 'fldelgF7uRKrchhhd', ref: 'fldfCeb7dYTCtC4hC', type: 'fld4bu1b1MFL4UrjS', cat: 'fldJeAiV8yadp5X5g',
  postes: 'fldubK9vnjkYLE15w', resume: 'fldy27HU7teroyZHs', contenu: 'fldMY1Tnd1011OOiZ', photos: 'fldWsJuC01JAJRDkj',
  docs: 'fldDBc2XjazLS2NHO', equip: 'fldjvu4Xpow9K35vx', espaces: 'fldqehstQ7NjHJjxu', mots: 'fld6Ja0q0gzRLirNh',
  statut: 'fldanlaFgjbLIVyz0', maj: 'fldWO4jvpKyA2M1pF', ecrans: 'fldYioPPlJNxO1e3v'
};

module.exports = async function handler(req, res) {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) return res.status(500).json({ error: 'config' });
  const preview = process.env.VERCEL_ENV !== 'production';
  const formula = preview ? "OR({Statut}='Publiée',{Statut}='À valider')" : "{Statut}='Publiée'";

  try {
    const records = [];
    let offset = '';
    for (let i = 0; i < 10; i++) {
      const q = new URLSearchParams({ filterByFormula: formula, returnFieldsByFieldId: 'true', pageSize: '100' });
      Object.values(F).forEach(id => q.append('fields[]', id));
      if (offset) q.set('offset', offset);
      const r = await fetch(`https://api.airtable.com/v0/${BASE}/${TABLE}?${q}`, { headers: { Authorization: 'Bearer ' + token } });
      if (!r.ok) {
        console.error('airtable', r.status, (await r.text()).slice(0, 300));
        return res.status(502).json({ error: 'airtable', status: r.status });
      }
      const j = await r.json();
      records.push(...(j.records || []));
      if (!j.offset) break;
      offset = j.offset;
    }
    const files = a => (a || []).map(x => ({ name: x.filename, url: x.url, type: x.type,
      thumb: x.thumbnails && x.thumbnails.large ? x.thumbnails.large.url : null }));
    const fiches = records.map(rec => {
      const f = rec.fields;
      return {
        id: f[F.ref] || rec.id,
        titre: f[F.titre] || 'Sans titre',
        type: f[F.type] || '',
        cat: f[F.cat] || 'Autres',
        postes: f[F.postes] || [],
        espaces: f[F.espaces] || [],
        ecrans: f[F.ecrans] || [],
        equip: f[F.equip] || '',
        resume: f[F.resume] || '',
        contenu: f[F.contenu] || '',
        mots: f[F.mots] || '',
        maj: f[F.maj] || '',
        relecture: f[F.statut] !== 'Publiée',
        photos: files(f[F.photos]).filter(x => /^image\//.test(x.type || '')),
        docs: files(f[F.docs])
      };
    }).sort((a, b) => a.cat.localeCompare(b.cat, 'fr') || a.titre.localeCompare(b.titre, 'fr'));
    // les liens des fichiers Airtable expirent au bout de quelques heures : cache court
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
    return res.status(200).json({ fiches, preview });
  } catch (e) {
    console.error('procedures', e.message);
    return res.status(502).json({ error: 'fetch' });
  }
};
