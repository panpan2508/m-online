# M-Online — Tracker de tournoi

Application web pour suivre le tournoi M-Online : classement en temps réel, planning des soirs, tableau des matchs.

## Stack

- `index.html` — Frontend statique hébergé sur GitHub Pages
- `Code.gs` — Backend Google Apps Script (Web App)
- Google Sheets — Base de données

---

## Déploiement en 10 minutes

### 1. Google Sheet

1. Va sur [sheets.google.com](https://sheets.google.com) → crée un nouveau fichier vide
2. Copie l'**ID** depuis l'URL :
   ```
   https://docs.google.com/spreadsheets/d/TON_ID_ICI/edit
   ```

### 2. Google Apps Script

1. Dans le Sheet → **Extensions → Apps Script**
2. Supprime le contenu par défaut et colle tout le contenu de `Code.gs`
3. Remplace ligne 4 :
   ```js
   const SHEET_ID = 'TON_ID_ICI';
   ```
4. Change le mot de passe admin ligne 5 si besoin :
   ```js
   const ADMIN_PASSWORD = 'tonmotdepasse';
   ```
5. **Déployer → Nouveau déploiement**
   - Type : **Web App**
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
6. Autorise les permissions → copie l'**URL de déploiement**

### 3. GitHub Pages

1. Crée un repo GitHub (ex: `m-online`)
2. Upload `index.html` à la racine
3. **Settings → Pages → Branch: main → / (root) → Save**
4. Ton site sera disponible sur `https://tonpseudo.github.io/m-online`

### 4. Initialiser les données

1. Ouvre ton site GitHub Pages
2. Va dans l'onglet **Config**
3. Colle l'URL Apps Script + le mot de passe admin
4. Clique **Sauvegarder**
5. Clique **Initialiser le Sheet** (une seule fois !)

Les onglets `Joueurs`, `Scores` et `Matchs` sont créés automatiquement avec les 16 joueurs placeholder et tous les matchs générés.

---

## Structure du Sheet

| Onglet | Contenu |
|--------|---------|
| `Joueurs` | Nom, total, points par jeu |
| `Scores` | Historique de chaque attribution de points |
| `Matchs` | Tous les matchs générés avec statut |

---

## Système de points

| Jeu | Victoire | Participation | Bonus |
|-----|----------|---------------|-------|
| CS2 | 3 pts | 1 pt | +1 MVP |
| LoL | 3 pts | 1 pt | +1 meilleur KDA |
| Fortnite | 5 pts (1er) | 1 pt | +1/élim (max 3) |
| Starcraft II | 2 pts | — | +1 victoire < 10 min |
| Brawlhalla | 5 pts (1er) | 1 pt | +2 champion final |

---

## Personnaliser les joueurs

Dans `Code.gs`, modifie le tableau `DEFAULT_PLAYERS` avant d'initialiser :

```js
const DEFAULT_PLAYERS = [
  'Pseudo1', 'Pseudo2', ...
];
```

Ou directement dans l'onglet `Joueurs` du Sheet après initialisation.

---

## Mise à jour des scores (admin)

Les scores se mettent à jour via un POST à l'API. Tu peux envoyer manuellement :

```json
POST https://script.google.com/macros/s/.../exec
{
  "action": "addScore",
  "password": "tonmotdepasse",
  "gameId": "cs2",
  "player": "Player01",
  "points": 3,
  "detail": "Victoire match M1"
}
```

Le classement se recalcule automatiquement.

---

## Refresh automatique

Le frontend se rafraîchit automatiquement toutes les **30 secondes**. Le bouton ↻ force un refresh immédiat.
