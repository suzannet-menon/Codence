const SECURITY_PATHS = ["auth/", "payments/", "config/", "security/"];
const DB_PATHS = ["db/", "migrations/", "schema/"];
const DEP_FILES = ["package.json", "requirements.txt", "go.mod", "Gemfile"];
const TITLE_KEYWORDS = ["refactor", "migrate", "remove", "replace", "fix", "security"];
const KEYWORD_CAP = 30;

export function scorePR(payload) {
  let score = 0;
  const reasons = [];
  const { title = "", files = [] } = payload;

  // Rule 1: security-sensitive paths (+30)
  if (files.some(f => SECURITY_PATHS.some(p => f.filename.startsWith(p)))) {
    score += 30;
    const match = files.find(f => SECURITY_PATHS.some(p => f.filename.startsWith(p)));
    reasons.push(`Touches security-sensitive path: ${match.filename}`);
  }

  // Rule 2: database/schema paths (+20)
  if (files.some(f => DB_PATHS.some(p => f.filename.startsWith(p)))) {
    score += 20;
    const match = files.find(f => DB_PATHS.some(p => f.filename.startsWith(p)));
    reasons.push(`Modifies database/schema path: ${match.filename}`);
  }

  // Rule 3: new files added (+15, once total)
  if (files.some(f => f.status === "added")) {
    score += 15;
    reasons.push("Includes newly added file(s)");
  }

  // Rule 4: dependency manifest (+20)
  if (files.some(f => DEP_FILES.includes(f.filename))) {
    score += 20;
    const match = files.find(f => DEP_FILES.includes(f.filename));
    reasons.push(`Modifies dependency manifest: ${match.filename}`);
  }

  // Rule 5: title keywords (+15 each, capped at +30)
  const titleLower = title.toLowerCase();
  let keywordScore = 0;
  const matchedKeywords = [];
  for (const kw of TITLE_KEYWORDS) {
    if (titleLower.includes(kw)) {
      keywordScore += 15;
      matchedKeywords.push(kw);
    }
  }
  if (keywordScore > 0) {
    const applied = Math.min(keywordScore, KEYWORD_CAP);
    score += applied;
    const capNote = applied < keywordScore ? ` (capped from ${keywordScore})` : "";
    reasons.push(`Title keywords matched: [${matchedKeywords.join(", ")}]${capNote}`);
  }

  return { score, reasons };
}
