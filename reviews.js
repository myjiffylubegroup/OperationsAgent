const express = require('express');
const drive = require('./google-auth');
const { parse } = require('csv-parse');
const { pipeline } = require('stream/promises');

const router = express.Router();

// Prefer env var if set; fall back to your existing ID
const FILE_ID = process.env.REV_FILE_ID || '14dYWSmP0JQ1Gh2Mp-ZsN1BUQv-aWdrTp';

// -------- helpers --------
const ratingMap = { one: '1', two: '2', three: '3', four: '4', five: '5' };
function normalizeRating(r) {
  if (!r) return null;
  const s = String(r).trim().toLowerCase();
  return ratingMap[s] || (['1','2','3','4','5'].includes(s) ? s : null);
}
function toISODateOnly(value) {
  if (!value) return null;
  const s = String(value).trim();
  // Fast path: already ISO-like at start
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  // Fallback: JS Date
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10);
}

async function getDriveStream(fileId) {
  const file = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  return file.data;
}

// -------- route --------
router.get('/', async (req, res) => {
  const { store_id, rating, start_date, end_date, debug } = req.query;

  // Normalize inputs
  const filterStore  = store_id?.trim() || null;
  const filterRating = rating ? normalizeRating(rating) : null;
  const filterStart  = start_date ? String(start_date).slice(0,10) : null;
  const filterEnd    = end_date   ? String(end_date).slice(0,10)   : null;

  if (start_date && !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
    return res.status(400).json({ error: "start_date must be YYYY-MM-DD" });
  }
  if (end_date && !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
    return res.status(400).json({ error: "end_date must be YYYY-MM-DD" });
  }
  if (rating && !filterRating) {
    return res.status(400).json({ error: "rating must be 1-5 or one…five" });
  }

  // Debug counters
  const stats = {
    total_rows: 0,
    after_store: 0,
    after_rating: 0,
    after_dates: 0,
    unique_after_dedupe: 0,
    store_values_sample: new Set(),
    rating_values_sample: new Set(),
    min_date: null,
    max_date: null
  };

  try {
    const csvStream = await getDriveStream(FILE_ID);

    const seen = new Set();
    let count = 0;

    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      bom: true,
      relax_column_count: true,
      trim: true,
    });

    parser.on('readable', () => {
      let row;
      while ((row = parser.read())) {
        stats.total_rows++;

        const rowStore  = (row.StoreNumber || row.Store_Number || row.store_number || '').toString().trim();
        const rowDate   = toISODateOnly(row.ReviewDate || row.review_date || row.Date || row.date);
        const rowRating = normalizeRating(row.Rating || row.rating);
        const reviewId  = (row.ReviewId || row.ReviewID || row.review_id || '').toString().trim();
        const comment   = (row.Comment || row.comment || '').toString().trim();

        if (rowStore) stats.store_values_sample.add(rowStore);
        if (rowRating) stats.rating_values_sample.add(rowRating);
        if (rowDate) {
          if (!stats.min_date || rowDate < stats.min_date) stats.min_date = rowDate;
          if (!stats.max_date || rowDate > stats.max_date) stats.max_date = rowDate;
        }

        // store filter
        if (filterStore && rowStore !== filterStore) continue;
        stats.after_store++;

        // rating filter
        if (filterRating && rowRating !== filterRating) continue;
        stats.after_rating++;

        // date filters
        if (filterStart && rowDate && rowDate < filterStart) continue;
        if (filterEnd   && rowDate && rowDate > filterEnd) continue;
        stats.after_dates++;

        // dedupe: prefer ReviewId; fallback to composite
        const key = reviewId || `${rowStore}|${rowDate}|${comment}`;
        if (seen.has(key)) continue;
        seen.add(key);

        count++;
      }
    });

    await pipeline(csvStream, parser);

    stats.unique_after_dedupe = count;

    // Normal response
    const payload = {
      store: filterStore || 'ALL',
      rating: filterRating || 'ALL',
      start_date: filterStart || 'N/A',
      end_date: filterEnd || 'N/A',
      review_count: count,
    };

    // Optional debug payload
    if (debug) {
      payload.debug = {
        counts: {
          total_rows: stats.total_rows,
          after_store: stats.after_store,
          after_rating: stats.after_rating,
          after_dates: stats.after_dates,
          unique_after_dedupe: stats.unique_after_dedupe
        },
        sample: {
          stores_seen: Array.from(stats.store_values_sample).slice(0, 20),
          ratings_seen: Array.from(stats.rating_values_sample).slice(0, 10),
        },
        date_range_in_file: {
          min: stats.min_date,
          max: stats.max_date
        },
        file_id_used: FILE_ID
      };
    }

    res.json(payload);

  } catch (err) {
    console.error('💥 Error:', err?.response?.data || err);
    res.status(500).json({ error: 'Failed to fetch or parse reviews.' });
  }
});

module.exports = router;
