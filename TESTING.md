# Codence Backend Testing Guide

## 1. What the backend does
The Codence backend is responsible for:
- Receiving GitHub webhook events for pull requests.
- Fetching PR diffs and metadata using the GitHub API.
- Scoring the PR's complexity based on rules (Person C).
- Creating an interview session and generating questions via Gemini (Person D) if the score is >= 50.
- Providing endpoints for the frontend to fetch the interview and submit answers.
- Summarizing the interview, generating embeddings, and storing the decision via ChromaDB (Person B).

## 2. Prerequisites
- Node.js (v18+)
- npm
- Git

## 3. Required environment variables
Create a `.env` file in the `backend` directory based on `.env.example`:
```env
PORT=5000
FRONTEND_URL=http://localhost:3000
GITHUB_TOKEN=your_github_pat_here
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
GEMINI_API_KEY=your_gemini_key_here
CHROMA_URL=http://localhost:8000
```
*(Never commit real secrets to version control!)*

## 4. Exact setup commands
```bash
cd backend
npm install
cp .env.example .env
```

## 5. Exact command to start the backend
```bash
npm run dev
```

## 6. How to test /ping
With the server running, send a GET request:
```bash
curl http://localhost:5000/ping
```
Expected response:
```json
{"success":true,"message":"Codence backend is alive!","timestamp":"..."}
```

## 7. Relevant API Endpoints

### GET `/ping`
- **Purpose**: Health check.
- **Request Format**: None.
- **Expected Response**: `{"success": true, "message": "..."}`

### POST `/webhook`
- **Purpose**: Receive GitHub PR events.
- **Request Format**: GitHub Webhook payload (JSON). Needs header `X-GitHub-Event: pull_request`.
- **Expected Response**:
  - Unimportant PR (Score < 50): `{"success":true,"message":"Processed PR #...", "important":false, "score":30}`
  - Important PR (Score >= 50): `{"success":true,"message":"Interview created...", "important":true, "score":65, "interviewId":"..."}`

### GET `/interview/:id`
- **Purpose**: Fetch interview questions and PR context.
- **Request Format**: URL parameter `:id`.
- **Expected Response**: `{"success":true, "interviewId":"...", "pr":{...}, "questions":["Q1","Q2","Q3"]}`

### POST `/interview/:id/submit`
- **Purpose**: Submit answers and generate a decision record.
- **Request Format**: `{"questions":["Q1","Q2","Q3"], "answers":["A1","A2","A3"]}`
- **Expected Response**: `{"success":true, "interviewId":"...", "summary":"..."}`

## 8. How to test the GitHub webhook
You can test the webhook locally using Postman, curl, or running the automated webhook test script:
```bash
npm run test:webhook
```
Or manually via curl:
```bash
curl -X POST http://localhost:5000/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: pull_request" \
  -d '{"action":"opened","pull_request":{"number":1,"title":"test","user":{"login":"user"},"head":{"sha":"abc"},"base":{"ref":"main"}},"repository":{"name":"repo","owner":{"login":"owner"}}}'
```

## 9. How to use ngrok for local webhook testing
1. Install ngrok.
2. Run ngrok to expose your local server: `ngrok http 5000`.
3. Copy the forwarding URL (e.g., `https://abc.ngrok.app`).
4. In your GitHub repository, go to Settings -> Webhooks -> Add webhook.
5. Set Payload URL to `https://abc.ngrok.app/webhook`.
6. Set Content type to `application/json`.
7. Choose "Let me select individual events" and select "Pull requests".
8. Set the secret to match `GITHUB_WEBHOOK_SECRET` in your `.env`.

## 10. Complete end-to-end flow
1. **GitHub PR**: A developer opens a PR.
2. **webhook**: GitHub sends a POST payload to `/webhook`.
3. **GitHub parser/service**: Backend normalizes the payload and fetches diff/files using `GITHUB_TOKEN`.
4. **scorer**: Evaluates PR rules.
5. **score >= 50**: Interview session is created; Gemini generates 3 questions based on diff.
6. **GET `/interview/:id`**: Frontend retrieves the 3 questions.
7. **submit answers**: Developer answers the 3 questions on the frontend and submits.
8. **summarizeTranscript**: Gemini summarizes Q&A into a decision record.
9. **embedding**: Gemini generates a vector for the summary.
10. **store_decision**: Record is stored in ChromaDB stub.

## 11. Automated test commands
```bash
# Test the PR scorer logic (Person C)
npm run test:scorer

# Test webhook and interview API endpoints
npm run test:webhook

# Test Gemini integrations (Requires GEMINI_API_KEY)
npm run test:gemini
```

## 12. Manual testing commands/examples
Test retrieving an interview (replace `:id` with an ID from the webhook response):
```bash
curl http://localhost:5000/interview/:id
```
Test submitting answers:
```bash
curl -X POST http://localhost:5000/interview/:id/submit \
  -H "Content-Type: application/json" \
  -d '{"questions":["Q1","Q2","Q3"],"answers":["A1","A2","A3"]}'
```

## 13. Expected successful results
- All tests passing in `npm run test:scorer` (58/58).
- `npm run test:webhook` outputs 34/34 passed.
- `npm run test:gemini` output depends on whether a valid `GEMINI_API_KEY` is configured. If not, fallback questions and summaries will be generated, but the embedding step will fail.

## 14. Common troubleshooting issues
- **`fetch failed` on test:webhook**: Ensure the backend server is running (`npm run dev`) before executing the tests.
- **Empty file list in scoring**: If `GITHUB_TOKEN` is missing, the backend cannot fetch PR files, meaning file-based scoring rules won't apply.
- **Gemini errors (`Could not load the default credentials`)**: Occurs when `GEMINI_API_KEY` is not set.

## 15. Person B/C/D dependencies
- **Person B (ChromaDB)**: The `store_decision` call is currently stubbed in `chromaStub.js` and logs to the console.
- **Person C (Scorer)**: Fully implemented and integrated in `scorer.js`.
- **Person D (Gemini / AI)**: Integrated in `gemini.js`. Works if `GEMINI_API_KEY` is provided; uses a fallback if missing or failing.

## 16. Status Table

| Feature / Integration | Status | Notes |
| :--- | :--- | :--- |
| Server startup | **VERIFIED** | Boots on port 5000 successfully. |
| GET /ping | **VERIFIED** | Returns 200 success. |
| POST /webhook (General) | **VERIFIED** | Handles payloads properly. |
| GitHub PR webhook handling | **VERIFIED** | Validates 'pull_request' actions. |
| GitHub event/action handling | **VERIFIED** | Ignores unrelated events. |
| GitHub parser / normalized data | **VERIFIED** | Normalizes PR payload effectively. |
| GitHub API integration | **NOT TESTED** | Needs real `GITHUB_TOKEN` for live API. |
| Webhook signature validation | **NOT TESTED** | Requires real GitHub integration and secret. |
| Scoring integration | **VERIFIED** | Scorer accurately identifies PR complexity. |
| score < 50 behavior | **VERIFIED** | Successfully skips interview creation. |
| score >= 50 behavior | **VERIFIED** | Successfully triggers interview pipeline. |
| Interview ID creation | **VERIFIED** | UUID generated correctly. |
| GET /interview/:id | **VERIFIED** | Returns context + exactly 3 questions. |
| Person D question-gen integration | **MOCKED** | Tested with fallbacks (no API key). |
| Exactly 3 interview questions | **VERIFIED** | Fallback generates exactly 3 questions. |
| POST /interview/:id/submit | **VERIFIED** | Validates answers and generates summary. |
| Answer validation | **VERIFIED** | Ensures question/answer count matches. |
| summarizeTranscript integration | **MOCKED** | Tested with fallback logic. |
| Embedding integration | **NOT TESTED** | Fails without real `GEMINI_API_KEY`. |
| Person B store_decision (ChromaDB) | **MOCKED** | Stub logs correctly. |
| Error handling (Missing IDs) | **VERIFIED** | Returns 404 for invalid IDs. |
| Error handling (Invalid payload) | **VERIFIED** | Returns 400 for bad JSON. |
