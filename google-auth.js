const { google } = require('googleapis');
const { JWT } = google.auth;

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

const auth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

module.exports = drive;
