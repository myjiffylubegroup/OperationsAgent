const express = require('express');
const dotenv = require('dotenv');
const reviewsRouter = require('./reviews');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('🔥 Turbo Reviews API is live');
});

app.use('/reviews', reviewsRouter);

app.listen(PORT, () => {
  console.log(`✅ Turbo API listening on port ${PORT}`);
});
