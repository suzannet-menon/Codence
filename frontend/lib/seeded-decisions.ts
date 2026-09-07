export type SeededDecision = {
  prTitle: string;
  prUrl: string;
  author: string;
  date: string;
  summary: string;
  keywords: string[];
};

export const seededDecisions: SeededDecision[] = [
  {
    prTitle: "Fix duplicate charges under high load",
    prUrl: "https://github.com/codence/demo/pull/47",
    author: "Aryan",
    date: "Mar 12, 2025",
    summary:
      "Removed the automatic retry logic in payment_processor.py because retries were firing before the gateway confirmed failure, causing customers to be charged twice under high load. Idempotency keys were considered but reverting the retry was the safer immediate fix.",
    keywords: ["payment", "retry", "duplicate", "charge", "gateway", "processor"]
  },
  {
    prTitle: "Migrate auth provider after CVE disclosure",
    prUrl: "https://github.com/codence/demo/pull/63",
    author: "Meghana",
    date: "Apr 3, 2025",
    summary:
      "Switched the login system away from the previous auth library after a CVE was disclosed against it. Patching in place was rejected because upstream had already stopped shipping security fixes for that version.",
    keywords: ["auth", "login", "cve", "security", "migration", "provider"]
  },
  {
    prTitle: "Add tiered importance scoring for PR interviews",
    prUrl: "https://github.com/codence/demo/pull/81",
    author: "Suzanne",
    date: "Jun 21, 2025",
    summary:
      "Introduced a scoring system based on rules so only PRs touching sensitive directories or config trigger a voice interview, instead of prompting on every PR. This kept interview fatigue low while still capturing the highest risk decisions.",
    keywords: ["scoring", "importance", "interview", "config", "webhook"]
  },
  {
    prTitle: "Switch vector search to local ChromaDB",
    prUrl: "https://github.com/codence/demo/pull/94",
    author: "Ruchira",
    date: "Jul 9, 2025",
    summary:
      "Moved decision storage from a hosted vector database to local ChromaDB so nothing leaves the developer's machine. Cloud API mode was kept as an option for teams that prefer convenience over privacy.",
    keywords: ["chromadb", "vector", "database", "privacy", "local", "embedding"]
  }
];

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "did", "do", "does", "for", "from",
  "had", "has", "have", "how", "if", "in", "is", "it", "of", "on", "or", "our", "that",
  "the", "this", "to", "was", "we", "were", "what", "when", "where", "which", "who",
  "why", "will", "with", "you", "your"
]);

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(Boolean);
}

export function searchSeededDecisions(query: string, topN = 3): SeededDecision[] {
  const terms = tokenize(query).filter((term) => term.length > 2 && !STOPWORDS.has(term));
  if (terms.length === 0) return [];

  return seededDecisions
    .map((decision) => {
      const haystack = new Set(
        tokenize(`${decision.summary} ${decision.prTitle} ${decision.keywords.join(" ")}`)
      );
      const score = terms.reduce((acc, term) => acc + (haystack.has(term) ? 1 : 0), 0);
      return { decision, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((entry) => entry.decision);
}
