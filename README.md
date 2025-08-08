# 🚀 Turbo Reviews API

Node.js API to filter and count reviews from Google_Reviews.csv stored in Google Drive.

## Features
- Access CSV from Google Drive using Service Account
- Filter by `store_id`, `rating`, `start_date`, `end_date`
- Dedupe by store/date/comment
- Designed to plug directly into a chatbot agent (Turbo)

## Example Request

GET /reviews?store_id=1002&rating=1&start_date=2025-01-01&end_date=2025-08-07## Output


## Output

```json
{
  "store": "1002",
  "rating": "1",
  "start_date": "2025-01-01",
  "end_date": "2025-08-07",
  "review_count": 12
}
