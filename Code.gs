// ============================================================
//  M-Online — Google Apps Script backend
//  Déployer comme Web App (Execute as: Me, Who has access: Anyone)
// ============================================================

const SHEET_ID = 'REMPLACE_PAR_TON_SHEET_ID'; // ← colle l'ID de ton Google Sheet ici
const ADMIN_PASSWORD = 'monlan2024';            // ← change ce mot de passe

// Noms des onglets
const TABS = {
  PLAYERS: 'Joueurs',
  SCORES:  'Scores',
  MATCHES: 'Matchs'
};

// Jeux et soirs
const GAMES = [
  { id: 'cs2',        name: 'CS2',              night: 1, type: 'team5v5', winPts: 3, participationPts: 1 },
  { id: 'lol',        name: 'League of Legends', night: 2, type: 'team5v5', winPts: 3, participationPts: 1 },
  { id: 'fortnite',   name: 'Fortnite',          night: 3, type: 'br',      winPts: 5, participationPts: 1 },
  { id: 'sc2',        name: 'Starcraft II',      night: 4, type: '1v1',     winPts: 2, participationPts: 0 },
  { id: 'brawlhalla', name: 'Brawlhalla',        night: 5, type: 'final',   winPts: 5, participationPts: 1 }
];

// Joueurs placeholder
const DEFAULT_PLAYERS = [
  'Player01','Player02','Player03','Player04',
  'Player05','Player06','Player07','Player08',
  'Player09','Player10','Player11','Player12',
  'Player13','Player14','Player15','Player16'
];

// ────────────────────────────────────────────────────────────
//  POINT D'ENTRÉE HTTP
// ────────────────────────────────────────────────────────────
function doGet(e) {
  const action = e.parameter.action || 'getAll';
  let result;
  try {
    if      (action === 'getAll')     result = getAllData();
    else if (action === 'getPlayers') result = getPlayers();
    else if (action === 'getScores')  result = getScores();
    else if (action === 'getMatches') result = getMatches();
    else                              result = { error: 'Action inconnue' };
  } catch(err) {
    result = { error: err.message };
  }
  return jsonResponse(result);
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch(_) { return jsonResponse({ error: 'JSON invalide' }); }

  if (body.password !== ADMIN_PASSWORD)
    return jsonResponse({ error: 'Mot de passe incorrect' });

  let result;
  try {
    if      (body.action === 'addScore')    result = addScore(body);
    else if (body.action === 'updateMatch') result = updateMatch(body);
    else if (body.action === 'initSheet')   result = initSheet();
    else                                    result = { error: 'Action inconnue' };
  } catch(err) {
    result = { error: err.message };
  }
  return jsonResponse(result);
}

// ────────────────────────────────────────────────────────────
//  LECTURE
// ────────────────────────────────────────────────────────────
function getAllData() {
  return {
    players: getPlayers(),
    scores:  getScores(),
    matches: getMatches(),
    games:   GAMES
  };
}

function getPlayers() {
  const sheet = getSheet(TABS.PLAYERS);
  const rows = sheet.getDataRange().getValues();
  return rows.slice(1).map(r => ({
    name: r[0],
    total: Number(r[1]) || 0,
    cs2: Number(r[2]) || 0,
    lol: Number(r[3]) || 0,
    fortnite: Number(r[4]) || 0,
    sc2: Number(r[5]) || 0,
    brawlhalla: Number(r[6]) || 0
  })).filter(p => p.name);
}

function getScores() {
  const sheet = getSheet(TABS.SCORES);
  const rows = sheet.getDataRange().getValues();
  return rows.slice(1).map(r => ({
    id:        r[0],
    gameId:    r[1],
    player:    r[2],
    points:    Number(r[3]) || 0,
    detail:    r[4],
    timestamp: r[5]
  })).filter(r => r.gameId);
}

function getMatches() {
  const sheet = getSheet(TABS.MATCHES);
  const rows = sheet.getDataRange().getValues();
  return rows.slice(1).map(r => ({
    id:        r[0],
    gameId:    r[1],
    night:     Number(r[2]),
    label:     r[3],
    team1:     r[4],
    team2:     r[5],
    winner:    r[6],
    status:    r[7]
  })).filter(r => r.gameId);
}

// ────────────────────────────────────────────────────────────
//  ÉCRITURE
// ────────────────────────────────────────────────────────────
function addScore(body) {
  const { gameId, player, points, detail } = body;
  if (!gameId || !player || points === undefined)
    throw new Error('Champs manquants : gameId, player, points');

  const scoreSheet = getSheet(TABS.SCORES);
  const id = 'SC' + Date.now();
  scoreSheet.appendRow([id, gameId, player, points, detail || '', new Date().toISOString()]);

  recalcPlayer(player);
  return { success: true, id };
}

function updateMatch(body) {
  const { matchId, winner } = body;
  if (!matchId || !winner) throw new Error('matchId et winner requis');

  const sheet = getSheet(TABS.MATCHES);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === matchId) {
      sheet.getRange(i + 1, 7).setValue(winner);
      sheet.getRange(i + 1, 8).setValue('terminé');

      const game = GAMES.find(g => g.id === rows[i][1]);
      if (game) {
        addScoreDirect(game.id, winner, game.winPts, 'Victoire match ' + matchId);
        const loser = winner === rows[i][4] ? rows[i][5] : rows[i][4];
        if (game.participationPts > 0)
          addScoreDirect(game.id, loser, game.participationPts, 'Participation match ' + matchId);
      }
      return { success: true };
    }
  }
  throw new Error('Match introuvable : ' + matchId);
}

function addScoreDirect(gameId, player, points, detail) {
  const sheet = getSheet(TABS.SCORES);
  sheet.appendRow(['SC' + Date.now() + Math.random(), gameId, player, points, detail, new Date().toISOString()]);
  recalcPlayer(player);
}

function recalcPlayer(playerName) {
  const scores = getScores().filter(s => s.player === playerName);
  const totals = { cs2:0, lol:0, fortnite:0, sc2:0, brawlhalla:0 };
  scores.forEach(s => { if (totals[s.gameId] !== undefined) totals[s.gameId] += s.points; });
  const total = Object.values(totals).reduce((a,b) => a+b, 0);

  const sheet = getSheet(TABS.PLAYERS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === playerName) {
      sheet.getRange(i+1, 2, 1, 6).setValues([[total, totals.cs2, totals.lol, totals.fortnite, totals.sc2, totals.brawlhalla]]);
      return;
    }
  }
}

// ────────────────────────────────────────────────────────────
//  INIT SHEET (à appeler une seule fois via un POST)
// ────────────────────────────────────────────────────────────
function initSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  function ensureSheet(name, headers) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    sheet.clearContents();
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    return sheet;
  }

  const playerSheet = ensureSheet(TABS.PLAYERS,
    ['Nom','Total','CS2','LoL','Fortnite','SC2','Brawlhalla']);
  DEFAULT_PLAYERS.forEach(name => playerSheet.appendRow([name,0,0,0,0,0,0]));

  ensureSheet(TABS.SCORES,
    ['ID','GameID','Joueur','Points','Détail','Timestamp']);

  const matchSheet = ensureSheet(TABS.MATCHES,
    ['ID','GameID','Soir','Label','Équipe1','Équipe2','Gagnant','Statut']);

  // Génère les matchs CS2 (2 groupes de 8, round robin)
  const p = DEFAULT_PLAYERS;
  let mid = 1;
  [[p.slice(0,8), 'Groupe A'],[p.slice(8,16), 'Groupe B']].forEach(([grp, grpName]) => {
    for (let i = 0; i < grp.length; i++)
      for (let j = i+1; j < grp.length; j++) {
        matchSheet.appendRow(['M'+mid++,'cs2',1,`CS2 ${grpName}`,grp[i],grp[j],'','à jouer']);
      }
  });

  // LoL : 4 équipes de 4, round robin
  const teams = [p.slice(0,4),p.slice(4,8),p.slice(8,12),p.slice(12,16)];
  teams.forEach((t,i) => {
    for(let j=i+1;j<teams.length;j++){
      matchSheet.appendRow(['M'+mid++,'lol',2,'LoL Team '+(i+1)+' vs '+(j+1),
        t.join(','), teams[j].join(','),'','à jouer']);
    }
  });

  // SC2 : 1v1, chacun joue vs tous (affichage groupé)
  for (let i=0;i<p.length;i++)
    for(let j=i+1;j<p.length;j++)
      matchSheet.appendRow(['M'+mid++,'sc2',4,'SC2 1v1',p[i],p[j],'','à jouer']);

  // Brawlhalla placeholder top 8
  for(let i=0;i<4;i++)
    matchSheet.appendRow(['M'+mid++,'brawlhalla',5,'Brawlhalla QF '+(i+1),'TBD','TBD','','à jouer']);
  matchSheet.appendRow(['M'+mid++,'brawlhalla',5,'Brawlhalla SF 1','TBD','TBD','','à jouer']);
  matchSheet.appendRow(['M'+mid++,'brawlhalla',5,'Brawlhalla SF 2','TBD','TBD','','à jouer']);
  matchSheet.appendRow(['M'+mid++,'brawlhalla',5,'Brawlhalla Finale','TBD','TBD','','à jouer']);

  return { success: true, message: 'Sheet initialisé avec succès !' };
}

// ────────────────────────────────────────────────────────────
//  HELPERS
// ────────────────────────────────────────────────────────────
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Onglet introuvable : ' + name);
  return sheet;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
