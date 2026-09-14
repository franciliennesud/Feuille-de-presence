// netlify/functions/saveData.js
// Reçoit les données envoyées par l'app (Feuille de Présence) et les écrit
// dans le Google Sheet "Base Sync - Feuille de Présence".

const { google } = require("googleapis");

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// Correspondance entre le "type" envoyé par l'app et le nom de l'onglet
const SHEET_NAMES = {
  presences: "Présences",
  enfants: "Élèves",
  animateurs: "Animateurs",
  lieux: "Lieux",
  niveaux: "Niveaux",
};

// Ordre des colonnes dans chaque onglet (doit correspondre aux en-têtes du Sheet)
const COLUMNS = {
  presences: ["id", "date", "animateur", "eleve", "niveau", "jour", "debut", "fin", "lieu", "mois", "semaineMois", "semaineAnnee", "elevePresent", "motif", "commentaire"],
  enfants: ["prenom", "nom", "lieu", "niveau", "creneaux"],
  animateurs: ["prenom", "nom", "lieux", "eleves"],
  lieux: ["nom", "adresse", "creneaux"],
  niveaux: ["nom"],
};

function getAuth() {
  const privateKey = (process.env.GOOGLE_SHEETS_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  return new google.auth.JWT(
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    null,
    privateKey,
    ["https://www.googleapis.com/auth/spreadsheets"]
  );
}

function rowFromItem(type, item) {
  return COLUMNS[type].map((col) => {
    const val = item[col];
    if (Array.isArray(val) || (val && typeof val === "object")) {
      return JSON.stringify(val);
    }
    return val === undefined || val === null ? "" : val;
  });
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Méthode non autorisée" };
  }

  try {
    const { type, data } = JSON.parse(event.body);
    const sheetName = SHEET_NAMES[type];
    if (!sheetName) {
      return { statusCode: 400, body: `Type inconnu : ${type}` };
    }

    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });

    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A2:Z10000`,
    });

    const rows = (data || []).map((item) => rowFromItem(type, item));
    if (rows.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!A2`,
        valueInputOption: "RAW",
        requestBody: { values: rows },
      });
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, rows: rows.length }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
