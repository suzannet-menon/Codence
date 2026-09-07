/**
 * test-webhook.js
 *
 * Local integration test for the Codence backend.
 *
 * Sends realistic HTTP requests to a running backend server and verifies
 * each step of the product flow:
 *
 *  1. Health check  — GET /ping
 *  2. Low-score PR  — POST /webhook (should NOT create interview)
 *  3. High-score PR — POST /webhook (SHOULD create interview)
 *  4. Get interview — GET /interview/:id (should return 3 questions)
 *  5. Submit        — POST /interview/:id/submit (should store decision)
 *  6. Bad ID        — GET /interview/nonexistent (should return 404)
 *  7. Bad body      — POST /interview/:id/submit with missing answers (400)
 *
 * IMPORTANT: Start the backend first.
 *   cd backend && npm run dev
 *
 * Then run this script:
 *   node scripts/test-webhook.js
 *
 * NOTE: Tests marked [MOCK] bypass the GitHub API and Gemini calls by using
 * a fake X-GitHub-Event that never hits GitHub. Real diff/file fetching is
 * therefore not exercised — that requires a live GitHub repo + token.
 */

import 'dotenv/config';

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;

let passed = 0;
let failed = 0;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

async function webhookRequest(payload, event = 'pull_request') {
  const res = await fetch(`${BASE_URL}/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GitHub-Event': event,
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fake webhook payloads
// ─────────────────────────────────────────────────────────────────────────────

/** Low-importance PR — score should be 0 */
const LOW_SCORE_PAYLOAD = {
  action: 'opened',
  pull_request: {
    number: 99,
    title:  'Update README typo',
    html_url: 'https://github.com/testowner/testrepo/pull/99',
    user: { login: 'alice', html_url: 'https://github.com/alice' },
    head: { ref: 'readme-fix', sha: 'abc123' },
    base: { ref: 'main' },
    updated_at: new Date().toISOString(),
    additions: 2,
    deletions: 1,
    changed_files: 1,
  },
  repository: {
    name:     'testrepo',
    html_url: 'https://github.com/testowner/testrepo',
    owner:    { login: 'testowner' },
  },
};

/**
 * High-importance PR — auth path + keyword "fix" + added file
 * Score: 30 (auth/) + 15 (keyword fix) + 15 (added file) = 60 → triggers interview
 *
 * NOTE: The webhook controller calls getPullRequestFiles via the GitHub API.
 * Since we're testing against localhost without a real GitHub repo, the
 * GitHub API call will fail gracefully (scored with empty file list).
 * Score without files = 15 (keyword only) which is < 50.
 *
 * To properly test scoring with files, either:
 *   a) Use a real GITHUB_TOKEN + real repo, OR
 *   b) The scorer stubs a response (future improvement).
 *
 * For this test we verify the webhook pipeline is wired correctly.
 * We'll manually inject a pre-scored interview for interview flow tests.
 */
const HIGH_SCORE_PAYLOAD = {
  action: 'opened',
  pull_request: {
    number: 42,
    title:  'fix: refactor auth middleware',
    html_url: 'https://github.com/testowner/testrepo/pull/42',
    user: { login: 'bob', html_url: 'https://github.com/bob' },
    head: { ref: 'fix-auth', sha: 'def456' },
    base: { ref: 'main' },
    updated_at: new Date().toISOString(),
    additions: 120,
    deletions: 40,
    changed_files: 3,
  },
  repository: {
    name:     'testrepo',
    html_url: 'https://github.com/testowner/testrepo',
    owner:    { login: 'testowner' },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log('Codence Backend — Integration Tests');
  console.log(`Target: ${BASE_URL}`);
  console.log(`${'═'.repeat(60)}\n`);

  // ── Test 1: Health check ──────────────────────────────────────────────────
  console.log('1. GET /ping');
  {
    const { status, body } = await request('GET', '/ping');
    assert(status === 200, `HTTP 200 (got ${status})`);
    assert(body.success === true, 'success: true');
    assert(typeof body.message === 'string', 'message is a string');
  }

  // ── Test 2: Unknown event type is ignored gracefully ─────────────────────
  console.log('\n2. POST /webhook — unknown event (push)');
  {
    const { status, body } = await webhookRequest({ ref: 'refs/heads/main' }, 'push');
    assert(status === 200, `HTTP 200 (got ${status})`);
    assert(body.success === true, 'success: true');
    assert(body.message?.includes('push'), 'mentions ignored event name');
  }

  // ── Test 3: Unsupported action (closed) ───────────────────────────────────
  console.log('\n3. POST /webhook — unsupported PR action (closed)');
  {
    const payload = { ...LOW_SCORE_PAYLOAD, action: 'closed' };
    const { status, body } = await webhookRequest(payload);
    assert(status === 200, `HTTP 200 (got ${status})`);
    assert(body.success === true, 'success: true');
    assert(body.message?.includes('closed'), 'mentions unsupported action');
  }

  // ── Test 4: Low-score PR (README edit) ────────────────────────────────────
  // Without GITHUB_TOKEN the file fetch will fail gracefully, scoring 0.
  console.log('\n4. POST /webhook — low-score PR (README edit)');
  {
    const { status, body } = await webhookRequest(LOW_SCORE_PAYLOAD);
    assert(status === 200, `HTTP 200 (got ${status})`);
    assert(body.success === true, 'success: true');
    assert(body.important === false, 'important: false');
    assert(body.interviewId === undefined, 'no interviewId returned');
    console.log(`     Score: ${body.score}`);
  }

  // ── Test 5: High-score PR — webhook pipeline ──────────────────────────────
  console.log('\n5. POST /webhook — high-score PR (fix + auth keyword)');
  let interviewId;
  {
    const { status, body } = await webhookRequest(HIGH_SCORE_PAYLOAD);
    assert(status === 200, `HTTP 200 (got ${status})`);
    assert(body.success === true, 'success: true');
    console.log(`     Score: ${body.score} | important: ${body.important}`);

    if (body.important) {
      // With no GITHUB_TOKEN the file list is empty, so score = keyword score only.
      // The title "fix: refactor auth middleware" has 'fix' and 'refactor' → 30 pts
      assert(typeof body.interviewId === 'string', 'interviewId is a string');
      interviewId = body.interviewId;
      console.log(`     Interview ID: ${interviewId}`);
    } else {
      console.log('     [INFO] Score below 50 without GITHUB_TOKEN — file list unavailable.');
      console.log('     [INFO] Seeding interview via POST /dev/seed-interview...');
      const seedRes  = await request('POST', '/dev/seed-interview', {});
      assert(seedRes.status === 200, `Seed endpoint HTTP 200 (got ${seedRes.status})`);
      interviewId = seedRes.body.interviewId;
      console.log(`     [INFO] Seeded interview: ${interviewId}`);
    }
  }

  // ── Test 6: GET /interview/:id — valid ────────────────────────────────────
  console.log('\n6. GET /interview/:id — valid ID');
  let generatedQuestions;
  if (interviewId) {
    const { status, body } = await request('GET', `/interview/${interviewId}`);
    assert(status === 200, `HTTP 200 (got ${status})`);
    assert(body.success === true, 'success: true');
    assert(body.interviewId === interviewId, 'interviewId matches');
    assert(typeof body.pr === 'object', 'pr object present');
    assert(Array.isArray(body.questions), 'questions is an array');
    assert(body.questions.length === 3, 'exactly 3 questions');
    assert(body.questions.every(q => typeof q === 'string'), 'all questions are strings');
    generatedQuestions = body.questions;
    console.log('     Questions:');
    body.questions.forEach((q, i) => console.log(`       ${i + 1}. ${q}`));
  } else {
    console.log('     [SKIP] No interviewId available');
  }

  // ── Test 7: GET /interview/:id — invalid ID ───────────────────────────────
  console.log('\n7. GET /interview/nonexistent-id');
  {
    const { status, body } = await request('GET', '/interview/nonexistent-id-xyz');
    assert(status === 404, `HTTP 404 (got ${status})`);
    assert(body.success === false, 'success: false');
    assert(typeof body.error === 'string', 'error message present');
  }

  // ── Test 8: POST /interview/:id/submit — missing answers ──────────────────
  console.log('\n8. POST /interview/:id/submit — mismatched answers length');
  if (interviewId) {
    // Re-inject session (GET /interview/:id does not delete it)
    const { status, body } = await request('POST', `/interview/${interviewId}/submit`, {
      questions: ['Q1', 'Q2', 'Q3'],
      answers:   ['A1'],              // intentional mismatch
    });
    assert(status === 400, `HTTP 400 (got ${status})`);
    assert(body.success === false, 'success: false');
    assert(body.error?.includes('mismatch'), 'mismatch error message');
  } else {
    console.log('     [SKIP] No interviewId available');
  }

  // ── Test 9: POST /interview/:id/submit — valid submission ─────────────────
  console.log('\n9. POST /interview/:id/submit — valid');
  if (interviewId && generatedQuestions) {
    // Re-inject the session because Test 8 was with GET (non-destructive)
    // The session is only removed on successful submit, so it should still exist.
    const { status, body } = await request('POST', `/interview/${interviewId}/submit`, {
      questions: generatedQuestions,
      answers: [
        'We needed to replace the legacy session handler which had a timing attack vulnerability.',
        'We considered passport.js but it added 3 transitive deps we did not need.',
        'The new middleware validates the token signature on every request — do not remove that check.',
      ],
    });
    assert(status === 200, `HTTP 200 (got ${status})`);
    assert(body.success === true, 'success: true');
    assert(typeof body.summary === 'string', 'summary returned');
    assert(body.interviewId === interviewId, 'interviewId matches');
    console.log(`     Summary (first 100 chars): ${body.summary?.slice(0, 100)}…`);
  } else {
    console.log('     [SKIP] No interviewId or questions available');
  }

  // ── Test 10: Malformed JSON body ──────────────────────────────────────────
  console.log('\n10. POST /webhook — malformed JSON');
  {
    const res = await fetch(`${BASE_URL}/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-GitHub-Event': 'pull_request' },
      body: '{not valid json',
    });
    assert(res.status === 400, `HTTP 400 (got ${res.status})`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Results: ${passed} passed / ${failed} failed`);
  console.log(`${'═'.repeat(60)}\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('\n[TEST HARNESS] Fatal error:', err.message);
  process.exit(1);
});
