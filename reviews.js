const express = require('express');
const drive = require('./google-auth');
const { parse } = require('csv-parse/sync');

const router = express.Router();

// Replace with your actual fileId
const FILE_ID = '14dYWSmP0JQ1Gh2Mp-ZsN1BUQv-aWdrTp';

router.get('/', async (req, res) => {
  const { store_id, rating, start_date, end_date } = req.query;

  try {
    const file = await drive.files.get(
      { fileId: FILE_ID, alt: 'media' },
      { responseType: 'stream' }
    );

    let csvData = '';
    await new Promise((resolve, reject) => {
      file.data
        .on('data', chunk => csvData += chunk)
        .on('end', resolve)
        .on('error', reject);
    });

    const records = parse(csvData, { columns: true, skip_empty_lines: true });
    const ratingMap = { one: '1', two: '2', three: '3', four: '4', five: '5' };
    const uniqueKeys = new Set();
    let count = 0;

    for (let row of records) {
      const rowStore = row.StoreNumber?.trim();
      const rowDate = row.ReviewDate?.slice(0, 10);
      const rawRating = row.Rating?.trim().toLowerCase();
      const rowRating = ratingMap[rawRating] || rawRating;
      const rowComment = row.Comment?.trim();

      if (store_id && rowStore !== store_id) continue;
      if (rating && rowRating !== rating) continue;
      if (start_date && rowDate < start_date) continue;
      if (end_date && rowDate > end_date) continue;

      const key = `${rowStore}|${rowDate}|${rowComment}`;
      if (!uniqueKeys.has(key)) {
        uniqueKeys.add(key);
        count++;
      }
    }

    res.json({
      store: store_id || 'ALL',
      rating: rating || 'ALL',
      start_date: start_date || 'N/A',
      end_date: end_date || 'N/A',
      review_count: count,
    });

  } catch (err) {
    console.error('💥 Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});

module.exports = router;
