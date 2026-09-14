// netlify/functions/uploadToDrive.js
// Reçoit un fichier généré par l'app (en base64, ex: export Excel/CSV)
// et l'enregistre dans un dossier Google Drive précis, via le même
// compte de service que pour la synchronisation Google Sheets.

const { google } = require("googleapis");
const { Readable } = require("stream");

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

function getAuth() {
  const privateKey = (process.env.GOOGLE_SHEETS_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  return new google.auth.JWT(
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    null,
    privateKey,
    ["https://www.googleapis.com/auth/drive"]
  );
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Méthode non autorisée" };
  }

  try {
    const { fileName, mimeType, base64Content } = JSON.parse(event.body);
    if (!fileName || !base64Content) {
      return { statusCode: 400, body: "fileName et base64Content sont requis" };
    }
    if (!FOLDER_ID) {
      return { statusCode: 500, body: "GOOGLE_DRIVE_FOLDER_ID n'est pas configuré" };
    }

    const auth = getAuth();
    const drive = google.drive({ version: "v3", auth });

    const buffer = Buffer.from(base64Content, "base64");
    const stream = Readable.from(buffer);

    const res = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [FOLDER_ID],
      },
      media: {
        mimeType: mimeType || "application/octet-stream",
        body: stream,
      },
      fields: "id, webViewLink",
      supportsAllDrives: true,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, id: res.data.id, url: res.data.webViewLink }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
