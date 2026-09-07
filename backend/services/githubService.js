/**
 * githubService.js
 *
 * All GitHub REST API calls are isolated here.
 * Nothing outside this file should construct GitHub API URLs or set
 * GitHub-specific headers directly.
 *
 * Exposed functions:
 *   getPullRequestFiles(owner, repo, prNumber)  → [{ filename, status, additions, deletions, patch }]
 *   getPullRequestDiff(owner, repo, prNumber)   → string (unified diff)
 *   getPullRequest(owner, repo, prNumber)        → raw GitHub PR object
 */

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Build common headers for all GitHub API requests.
 * Uses GITHUB_TOKEN from env if set.
 * NEVER logs the token.
 *
 * @returns {Object} HTTP headers
 */
function buildHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Performs a GET request to the GitHub REST API.
 *
 * @param {string} path   – API path, e.g. '/repos/owner/repo/pulls/1/files'
 * @param {string} [accept] – Optional Accept header override
 * @returns {Promise<*>}  – Parsed JSON response
 * @throws {Error}        – Throws on non-2xx responses
 */
async function githubGet(path, accept) {
  const headers = buildHeaders();
  if (accept) headers.Accept = accept;

  const url = `${GITHUB_API_BASE}${path}`;
  console.log(`[GITHUB] GET ${url}`);

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(
      `[GITHUB] API error ${response.status} ${response.statusText} for ${url}`
    );
  }

  // Some endpoints return plain text (diff), others return JSON
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

/**
 * Fetch the list of files changed in a pull request.
 *
 * Each entry has at minimum: filename, status, additions, deletions, patch.
 * This is the canonical source for the file list that the scorer uses.
 *
 * @param {string} owner
 * @param {string} repo
 * @param {number|string} prNumber
 * @returns {Promise<Array<{filename: string, status: string, additions: number, deletions: number, patch: string}>>}
 */
export async function getPullRequestFiles(owner, repo, prNumber) {
  const path = `/repos/${owner}/${repo}/pulls/${prNumber}/files`;
  console.log(`[GITHUB] Fetching PR files for ${owner}/${repo}#${prNumber}`);
  const files = await githubGet(path);
  return Array.isArray(files) ? files : [];
}

/**
 * Fetch the unified diff for a pull request.
 *
 * GitHub returns the diff as plain text when the Accept header is set to
 * 'application/vnd.github.diff'.
 *
 * @param {string} owner
 * @param {string} repo
 * @param {number|string} prNumber
 * @returns {Promise<string>} Unified diff string
 */
export async function getPullRequestDiff(owner, repo, prNumber) {
  const path = `/repos/${owner}/${repo}/pulls/${prNumber}`;
  console.log(`[GITHUB] Fetching PR diff for ${owner}/${repo}#${prNumber}`);
  const diff = await githubGet(path, 'application/vnd.github.diff');
  return typeof diff === 'string' ? diff : '';
}

/**
 * Fetch the full PR object from the GitHub REST API.
 * Useful for ensuring all stats (additions, deletions, changed_files) are
 * up-to-date even if the webhook payload was incomplete.
 *
 * @param {string} owner
 * @param {string} repo
 * @param {number|string} prNumber
 * @returns {Promise<Object>} Raw GitHub PR object
 */
export async function getPullRequest(owner, repo, prNumber) {
  const path = `/repos/${owner}/${repo}/pulls/${prNumber}`;
  console.log(`[GITHUB] Fetching PR metadata for ${owner}/${repo}#${prNumber}`);
  return githubGet(path);
}
