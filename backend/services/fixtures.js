export default [
  // ============================================================
  // ORIGINAL 8 — Happy-path representative cases
  // ============================================================
  {
    label: "Low-risk README edit",
    title: "Update README typo",
    author: "alice",
    pr_url: "https://github.com/org/repo/pull/1",
    files: [{ filename: "README.md", status: "modified" }],
    expectedScore: 0,
    expectedFlagged: false,
  },
  {
    label: "High-risk auth + db change",
    title: "Add two-factor auth",
    author: "bob",
    pr_url: "https://github.com/org/repo/pull/2",
    files: [
      { filename: "auth/login.js", status: "modified" },
      { filename: "db/users.sql", status: "added" },
    ],
    expectedScore: 65,
    expectedFlagged: true,
  },
  {
    label: "Keyword + dependency combo",
    title: "fix: migrate to new ORM",
    author: "carol",
    pr_url: "https://github.com/org/repo/pull/3",
    files: [
      { filename: "src/data.js", status: "modified" },
      { filename: "package.json", status: "modified" },
    ],
    expectedScore: 50,
    expectedFlagged: true,
  },
  {
    label: "Multiple added files (capped at +15)",
    title: "Add unit tests",
    author: "dave",
    pr_url: "https://github.com/org/repo/pull/4",
    files: [
      { filename: "tests/a.test.js", status: "added" },
      { filename: "tests/b.test.js", status: "added" },
      { filename: "tests/c.test.js", status: "added" },
    ],
    expectedScore: 15,
    expectedFlagged: false,
  },
  {
    label: "Keyword fix+security + dep = exactly 50",
    title: "fix: patch security issue",
    author: "eve",
    pr_url: "https://github.com/org/repo/pull/5",
    files: [
      { filename: "app.js", status: "modified" },
      { filename: "package.json", status: "modified" },
    ],
    expectedScore: 50,
    expectedFlagged: true,
  },
  {
    label: "No rules fire",
    title: "typo correction",
    author: "frank",
    pr_url: "https://github.com/org/repo/pull/6",
    files: [{ filename: "docs/guide.md", status: "modified" }],
    expectedScore: 0,
    expectedFlagged: false,
  },
  {
    label: "Merge commit — empty files",
    title: "Merge branch 'main' into feature-login",
    author: "grace",
    pr_url: "https://github.com/org/repo/pull/7",
    files: [],
    expectedScore: 0,
    expectedFlagged: false,
  },
  {
    label: "Empty title — must not throw",
    title: "",
    author: "unknown",
    pr_url: "https://github.com/org/repo/pull/8",
    files: [],
    expectedScore: 0,
    expectedFlagged: false,
  },

  // ============================================================
  // SINGLE RULE ISOLATION — Each rule alone
  // ============================================================
  {
    label: "R1: security path (auth/)",
    title: "auth change",
    files: [{ filename: "auth/login.js", status: "modified" }],
    expectedScore: 30,
    expectedFlagged: false,
  },
  {
    label: "R1: security path (payments/)",
    title: "payments change",
    files: [{ filename: "payments/stripe.js", status: "modified" }],
    expectedScore: 30,
    expectedFlagged: false,
  },
  {
    label: "R1: security path (config/)",
    title: "config change",
    files: [{ filename: "config/settings.yaml", status: "modified" }],
    expectedScore: 30,
    expectedFlagged: false,
  },
  {
    label: "R1: security path (security/)",
    title: "audit logs",
    files: [{ filename: "security/audit.log", status: "modified" }],
    expectedScore: 30,
    expectedFlagged: false,
  },
  {
    label: "R2: db path (db/)",
    title: "db change",
    files: [{ filename: "db/schema.sql", status: "modified" }],
    expectedScore: 20,
    expectedFlagged: false,
  },
  {
    label: "R2: db path (migrations/)",
    title: "migration",
    files: [{ filename: "migrations/001.sql", status: "modified" }],
    expectedScore: 20,
    expectedFlagged: false,
  },
  {
    label: "R2: db path (schema/)",
    title: "schema update",
    files: [{ filename: "schema/types.ts", status: "modified" }],
    expectedScore: 20,
    expectedFlagged: false,
  },
  {
    label: "R3: added file",
    title: "add file",
    files: [{ filename: "x.js", status: "added" }],
    expectedScore: 15,
    expectedFlagged: false,
  },
  {
    label: "R4: package.json",
    title: "dep update",
    files: [{ filename: "package.json", status: "modified" }],
    expectedScore: 20,
    expectedFlagged: false,
  },
  {
    label: "R4: requirements.txt",
    title: "python deps",
    files: [{ filename: "requirements.txt", status: "modified" }],
    expectedScore: 20,
    expectedFlagged: false,
  },
  {
    label: "R4: go.mod",
    title: "go deps",
    files: [{ filename: "go.mod", status: "modified" }],
    expectedScore: 20,
    expectedFlagged: false,
  },
  {
    label: "R4: Gemfile",
    title: "ruby deps",
    files: [{ filename: "Gemfile", status: "modified" }],
    expectedScore: 20,
    expectedFlagged: false,
  },
  {
    label: "R5: keyword 'fix'",
    title: "fix something",
    files: [],
    expectedScore: 15,
    expectedFlagged: false,
  },
  {
    label: "R5: keyword 'security'",
    title: "security patch",
    files: [],
    expectedScore: 15,
    expectedFlagged: false,
  },
  {
    label: "R5: keyword 'refactor'",
    title: "refactor util",
    files: [],
    expectedScore: 15,
    expectedFlagged: false,
  },
  {
    label: "R5: keyword 'migrate'",
    title: "migrate db",
    files: [],
    expectedScore: 15,
    expectedFlagged: false,
  },
  {
    label: "R5: keyword 'remove'",
    title: "remove dead code",
    files: [],
    expectedScore: 15,
    expectedFlagged: false,
  },
  {
    label: "R5: keyword 'replace'",
    title: "replace logger",
    files: [],
    expectedScore: 15,
    expectedFlagged: false,
  },

  // ============================================================
  // KEYWORD CAP
  // ============================================================
  {
    label: "CAP: 2 keywords — no cap yet",
    title: "fix security",
    files: [],
    expectedScore: 30,
    expectedFlagged: false,
  },
  {
    label: "CAP: 3 keywords — capped from 45",
    title: "fix refactor security",
    files: [],
    expectedScore: 30,
    expectedFlagged: false,
    expectedReasonContains: "(capped from 45)",
  },
  {
    label: "CAP: 4 keywords — capped from 60",
    title: "fix remove refactor security",
    files: [],
    expectedScore: 30,
    expectedFlagged: false,
  },
  {
    label: "CAP: all 6 keywords — capped from 90",
    title: "refactor migrate remove replace fix security",
    files: [],
    expectedScore: 30,
    expectedFlagged: false,
  },

  // ============================================================
  // SUBSTRING / CASE EDGE CASES
  // ============================================================
  {
    label: "SUB: 'refactoring' matches 'refactor'",
    title: "refactoring auth",
    files: [],
    expectedScore: 15,
    expectedFlagged: false,
  },
  {
    label: "SUB: 'securityfix' matches both keywords",
    title: "securityfix",
    files: [],
    expectedScore: 30,
    expectedFlagged: false,
  },
  {
    label: "CASE: uppercase 'FIX' matches",
    title: "FIX something",
    files: [],
    expectedScore: 15,
    expectedFlagged: false,
  },
  {
    label: "CASE: mixed case 'Security' matches",
    title: "Security patch",
    files: [],
    expectedScore: 15,
    expectedFlagged: false,
  },
  {
    label: "NO: 'config' alone is not a keyword",
    title: "config update",
    files: [],
    expectedScore: 0,
    expectedFlagged: false,
  },
  {
    label: "NO: 'se' alone does not match 'security'",
    title: "se means second",
    files: [],
    expectedScore: 0,
    expectedFlagged: false,
  },
  {
    label: "NO: 'sec' alone does not match 'security'",
    title: "sec means second",
    files: [],
    expectedScore: 0,
    expectedFlagged: false,
  },

  // ============================================================
  // PATH PREFIX EXACTNESS
  // ============================================================
  {
    label: "NO: 'config.json' does NOT match 'config/'",
    title: "config file",
    files: [{ filename: "config.json", status: "modified" }],
    expectedScore: 0,
    expectedFlagged: false,
  },
  {
    label: "NO: 'authentication.js' does NOT match 'auth/'",
    title: "auth file",
    files: [{ filename: "authentication.js", status: "modified" }],
    expectedScore: 0,
    expectedFlagged: false,
  },
  {
    label: "YES: 'config/settings.yaml' matches 'config/'",
    title: "config nested",
    files: [{ filename: "config/settings.yaml", status: "modified" }],
    expectedScore: 30,
    expectedFlagged: false,
  },
  {
    label: "YES: 'payments/stripe.js' matches 'payments/'",
    title: "payments nested",
    files: [{ filename: "payments/stripe.js", status: "modified" }],
    expectedScore: 30,
    expectedFlagged: false,
  },
  {
    label: "NO: 'package' (no ext) does NOT match dep",
    title: "dep no ext",
    files: [{ filename: "package", status: "modified" }],
    expectedScore: 0,
    expectedFlagged: false,
  },
  {
    label: "NO: 'requirements.txt.bak' does NOT match dep",
    title: "dep backup",
    files: [{ filename: "requirements.txt.bak", status: "modified" }],
    expectedScore: 0,
    expectedFlagged: false,
  },
  {
    label: "NO: 'go.mod.bak' does NOT match dep",
    title: "go backup",
    files: [{ filename: "go.mod.bak", status: "modified" }],
    expectedScore: 0,
    expectedFlagged: false,
  },

  // ============================================================
  // FILE STATUS VARIANTS
  // ============================================================
  {
    label: "STATUS: 'removed' does NOT trigger R3",
    title: "delete file",
    files: [{ filename: "x.js", status: "removed" }],
    expectedScore: 0,
    expectedFlagged: false,
  },
  {
    label: "STATUS: 'modified' does NOT trigger R3",
    title: "modify file",
    files: [{ filename: "x.js", status: "modified" }],
    expectedScore: 0,
    expectedFlagged: false,
  },
  {
    label: "STATUS: mixed modified+added triggers R3 once",
    title: "mixed status",
    files: [
      { filename: "a.js", status: "modified" },
      { filename: "b.js", status: "added" },
    ],
    expectedScore: 15,
    expectedFlagged: false,
  },

  // ============================================================
  // THRESHOLD BOUNDARY
  // ============================================================
  {
    label: "THRESH: 35 — below 50, not flagged",
    title: "fix",
    files: [{ filename: "package.json", status: "modified" }],
    expectedScore: 35,
    expectedFlagged: false,
  },
  {
    label: "THRESH: 50 — exactly at threshold, flagged",
    title: "fix",
    files: [
      { filename: "package.json", status: "modified" },
      { filename: "x.js", status: "added" },
    ],
    expectedScore: 50,
    expectedFlagged: true,
  },
  {
    label: "THRESH: 100 — well above threshold",
    title: "fix",
    files: [
      { filename: "auth/login.js", status: "modified" },
      { filename: "db/x.sql", status: "added" },
      { filename: "package.json", status: "modified" },
    ],
    expectedScore: 100,
    expectedFlagged: true,
  },

  // ============================================================
  // COMBINATION STRESS
  // ============================================================
  {
    label: "MAX: all 5 rules fire simultaneously",
    title: "fix security",
    files: [
      { filename: "auth/login.js", status: "added" },
      { filename: "db/schema.sql", status: "modified" },
      { filename: "package.json", status: "modified" },
    ],
    expectedScore: 115,
    expectedFlagged: true,
  },
  {
    label: "MIN: empty title + empty files",
    title: "",
    files: [],
    expectedScore: 0,
    expectedFlagged: false,
  },
  {
    label: "MIN: no title key + no files key",
    title: undefined,
    files: undefined,
    expectedScore: 0,
    expectedFlagged: false,
  },
  {
    label: "MIN: only keyword, no files",
    title: "fix",
    files: [],
    expectedScore: 15,
    expectedFlagged: false,
  },
  {
    label: "MIN: only files, no title",
    title: "",
    files: [{ filename: "auth/x.js", status: "modified" }],
    expectedScore: 30,
    expectedFlagged: false,
  },

  // ============================================================
  // REASON STRING FORMAT
  // ============================================================
  {
    label: "REASON: cap note present for 3 keywords",
    title: "fix refactor security",
    files: [],
    expectedScore: 30,
    expectedFlagged: false,
    expectedReasonContains: "(capped from 45)",
  },
  {
    label: "REASON: no cap note for 2 keywords",
    title: "fix security",
    files: [],
    expectedScore: 30,
    expectedFlagged: false,
    expectedReasonNotContains: "capped",
  },
  {
    label: "REASON: R3 always uses same string",
    title: "add files",
    files: [
      { filename: "a.js", status: "added" },
      { filename: "b.js", status: "added" },
      { filename: "c.js", status: "added" },
    ],
    expectedScore: 15,
    expectedFlagged: false,
    expectedReasonContains: "Includes newly added file(s)",
  },
];
