/**
 * interviewStore.js
 *
 * Lightweight in-memory store for interview sessions.
 *
 * Each record keyed by the interview ID contains:
 * {
 *   id           : string   – UUID
 *   pr           : Object   – Normalised Codence PR object from githubParser
 *   files        : Array    – File list from githubService (filename, status, patch)
 *   score        : number   – Importance score from scorer
 *   reasons      : string[] – Scoring reasons from scorer
 *   createdAt    : string   – ISO 8601
 * }
 *
 * NOTE: This is an MVP in-memory implementation.
 * Person B's ChromaDB integration (chromaStub / chroma.js) stores the final
 * *decision* records after the interview is submitted.
 * This store only holds *pending* interview sessions (between webhook and submit).
 *
 * If the server restarts, pending interviews are lost — acceptable for hackathon.
 * Replace with a database-backed implementation for production.
 */

/** @type {Map<string, Object>} */
const store = new Map();

/**
 * Persist an interview session.
 *
 * @param {string} id   – Interview UUID
 * @param {Object} data – Interview session data
 * @returns {void}
 */
export function save(id, data) {
  store.set(id, data);
  console.log(`[STORE] Saved interview ${id} (total: ${store.size})`);
}

/**
 * Retrieve an interview session by ID.
 *
 * @param {string} id
 * @returns {Object|undefined} The session data, or undefined if not found
 */
export function get(id) {
  return store.get(id);
}

/**
 * Delete an interview session after it has been submitted.
 *
 * @param {string} id
 * @returns {boolean} true if the record existed and was deleted
 */
export function remove(id) {
  const existed = store.has(id);
  store.delete(id);
  if (existed) {
    console.log(`[STORE] Deleted interview ${id} (total: ${store.size})`);
  }
  return existed;
}

/**
 * Return the number of pending interview sessions.
 * Useful for health checks / debugging.
 *
 * @returns {number}
 */
export function size() {
  return store.size;
}
