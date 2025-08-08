const { google } = require('googleapis');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

// Load the key from local file
const keyPath = path.join(__dirname, 'service-account.json');
const auth = new google.auth.GoogleAuth({
  keyFile: keyPath,
  scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

module.exports = drive;
