import fixtures from "./fixtures.js";
import { scorePR } from "./scorer.js";

const hasColor = process.stdout.isTTY;
const green = (s) => (hasColor ? `\x1b[32m${s}\x1b[0m` : s);
const red = (s) => (hasColor ? `\x1b[31m${s}\x1b[0m` : s);

let passed = 0;
let failed = 0;

for (let i = 0; i < fixtures.length; i++) {
  const fixture = fixtures[i];

  let actual;
  let threw = false;
  try {
    actual = scorePR(fixture);
  } catch (e) {
    threw = true;
    actual = { score: -999, reasons: [e.message] };
  }

  const flagged = actual.score >= 50;
  const label = fixture.label || fixture.title || "(empty)";

  const scoreOk = actual.score === fixture.expectedScore;
  const flaggedOk = flagged === fixture.expectedFlagged;
  let reasonOk = true;
  let reasonFailMsg = "";

  if (fixture.expectedReasonContains) {
    const found = actual.reasons.some((r) => r.includes(fixture.expectedReasonContains));
    if (!found) {
      reasonOk = false;
      reasonFailMsg = `expected reasons to contain "${fixture.expectedReasonContains}", got: ${JSON.stringify(actual.reasons)}`;
    }
  }
  if (fixture.expectedReasonNotContains) {
    const found = actual.reasons.some((r) => r.includes(fixture.expectedReasonNotContains));
    if (found) {
      reasonOk = false;
      reasonFailMsg = `expected reasons NOT to contain "${fixture.expectedReasonNotContains}", got: ${JSON.stringify(actual.reasons)}`;
    }
  }

  const ok = scoreOk && flaggedOk && reasonOk && !threw;

  if (ok) {
    passed++;
    console.log(`${green("PASS")}  ${i + 1}. ${label}  score=${actual.score}`);
  } else {
    failed++;
    console.log(`${red("FAIL")}  ${i + 1}. ${label}`);
    if (threw) {
      console.log(`      THREW: ${actual.reasons[0]}`);
    } else {
      if (!scoreOk) {
        console.log(`      Expected score: ${fixture.expectedScore}  Actual score: ${actual.score}`);
      }
      if (!flaggedOk) {
        console.log(`      Expected flagged: ${fixture.expectedFlagged}  Actual flagged: ${flagged}`);
      }
      if (!reasonOk) {
        console.log(`      ${reasonFailMsg}`);
      }
    }
  }
}

console.log(`\n${passed}/${fixtures.length} passed`);
