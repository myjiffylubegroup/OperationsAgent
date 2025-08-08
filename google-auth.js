const { google } = require('googleapis');
const path = require('path');

// Path to the Render Secret File
const keyFilePath = '/etc/secrets/turbodataapi-ca0fce529f90.json';

const auth = new google.auth.GoogleAuth({
  keyFile: keyFilePath,
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

const drive = google.drive({ version: 'v3', auth });

module.exports = drive;
