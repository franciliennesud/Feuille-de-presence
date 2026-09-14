// netlify/functions/getData.js
// Relit le Google Sheet et renvoie toutes les données à l'app au chargement.

const { google } = require("googleapis");

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

const SHEET_NAMES = {
  presences: "Présences",
  enfants: "Élèves",
  animateurs: "Animateurs",
  lieux: "Lieux",
  niveaux: "Niveaux",
};

function getAuth() {
  const privateKey = (process.env.GOOGLE_SHEETS_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  return new google.auth.JWT(
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    null,
    privateKey,
    ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  );
}

// Transforme les lignes brutes du Sheet en tableau d'objets, en utilisant
// la
