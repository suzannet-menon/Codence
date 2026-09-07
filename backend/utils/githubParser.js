/**
 * githubParser.js
 *
 * Converts a raw GitHub webhook payload into a normalised Codence PR object.
 * Nothing outside this file should reference raw GitHub payload fields directly.
 *
 * Normalised PR shape:
 * {
 *   action          : string   – 'opened' | 'reopened' | 'synchronize' | …
 *   prNumber        : number
 *   prTitle         : string
 *   prUrl           : string
 *   repositoryName  : string
 *   repositoryOwner : string
 *   repositoryUrl   : string
 *   author          : string
 *   authorUrl       : string
 *   baseBranch      : string
 *   headBranch      : string
 *   commitSha       : string
 *   changedFiles    : number   – NOTE: GitHub webhook only includes this for
 *                               'closed' events; 0 otherwise. Use githubService
 *                               to get the real list of changed files.
 *   additions       : number
 *   deletions       : number
 *   diff            : string   – empty string; must be fetched via githubService
 *   timestamp       : string   – ISO 8601
 * }
 */

/**
 * Safely read a string, returning '' if the value is nullish or not a string.
 * @param {*} v
 * @returns {string}
 */
function safeStr(v) {
  return typeof v === 'string' ? v : '';
}

/**
 * Safely read a number, returning the fallback if the value is not a number.
 * @param {*} v
 * @param {number} [fallback=0]
 * @returns {number}
 */
function safeNum(v, fallback = 0) {
  return typeof v === 'number' ? v : fallback;
}

/**
 * Parse a raw GitHub pull_request webhook payload.
 *
 * @param {Object} payload – The parsed JSON body from the GitHub webhook.
 * @returns {Object} Normalised Codence PR object.
 */
export function parsePullRequestPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('[PARSER] Invalid payload: expected a non-null object');
  }

  const pr   = payload.pull_request || {};
  const repo = payload.repository   || {};
  const head = pr.head              || {};
  const base = pr.base              || {};
  const user = pr.user              || {};

  return {
    // Event-level field
    action: safeStr(payload.action),

    // PR identity
    prNumber: safeNum(pr.number),
    prTitle:  safeStr(pr.title),
    prUrl:    safeStr(pr.html_url),

    // Repository
    repositoryName:  safeStr(repo.name),
    repositoryOwner: safeStr(repo.owner?.login),
    repositoryUrl:   safeStr(repo.html_url),

    // Author
    author:    safeStr(user.login),
    authorUrl: safeStr(user.html_url),

    // Branches
    baseBranch: safeStr(base.ref),
    headBranch: safeStr(head.ref),

    // Latest commit on the head branch
    commitSha: safeStr(head.sha),

    // Stats — present in the webhook payload for some events but not reliably
    // for newly opened PRs.  Treat as best-effort; githubService fills the gap.
    changedFiles: safeNum(pr.changed_files),
    additions:    safeNum(pr.additions),
    deletions:    safeNum(pr.deletions),

    // Diff — NOT available in the webhook payload.
    // githubService.getPullRequestDiff() must be called to populate this.
    diff: '',

    // Event timestamp — prefer the PR's updated_at, fall back to created_at
    timestamp: safeStr(pr.updated_at || pr.created_at),
  };
}
