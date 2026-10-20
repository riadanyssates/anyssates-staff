# Anyssates Staff

Application du personnel du Riad Anyssates (démo).

- `index.html` : toute l'appli (HTML/CSS/JS, sans build)
- `api/spa.js` : lecture du planning Spa Wix (variable Vercel `WIX_API_KEY`, sans code)
- `api/octorate.js` : lecture des réservations Octorate pour les chambres, le ménage et le planning de demain.
  Variables Vercel : `OCTORATE_CLIENT_ID`, `OCTORATE_CLIENT_SECRET`, et `OCTORATE_REFRESH_TOKEN` si l'accès vient d'une autorisation OAuth.
  `STAFF_PIN` (facultatif) demande le code équipe avant d'afficher les noms des clients.
  Sans ces variables, l'appli garde les chambres de démonstration.

- `api/procedures.js` : lecture des fiches de la base Airtable « PROCÉDURES & MODES D'EMPLOI » (variable Vercel `AIRTABLE_TOKEN`, jeton en lecture seule sur cette base).
  En production, seules les fiches « Publiée » apparaissent ; sur les adresses de test, les fiches « À valider » aussi (marquées « En relecture »).
  La colonne « Écrans de l'appli » d'Airtable place la fiche en raccourci « Fiches utiles » sur l'écran choisi (Ménage, Mes tâches, Spa…).
- `logo.png` : logo du riad, utilisé pour l'impression des fiches.

Déployé sur Vercel : projet `anyssates-staff-demo`.
