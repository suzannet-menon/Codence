import 'dotenv/config';
import { generateQuestions, summarizeTranscript, embedSummary, buildDecisionRecord, generateAnswer } from '../services/gemini.js';
import { store_decision } from '../services/chromaStub.js';

async function runTests() {
  console.log("=== Testing generateQuestions ===");
  
  const test1Title = "feat: Add user authentication";
  const test1Diff = `
+ function login(username, password) {
+   // TODO: implement actual auth
+   return true;
+ }
  `;
  
  console.log(`\nTest 1 - PR: ${test1Title}`);
  const questions1 = await generateQuestions(test1Title, test1Diff);
  console.log("Questions:");
  questions1.forEach((q, i) => console.log(`${i + 1}. ${q}`));
  if (questions1.length === 3) {
      console.log("✅ PASS: Generated exactly 3 questions.");
  } else {
      console.log("❌ FAIL: Did not generate exactly 3 questions.");
  }

  const test2Title = "fix: Handle null pointer exception in user profile";
  const test2Diff = `
- const userName = user.profile.name;
+ const userName = user?.profile?.name || 'Anonymous';
  `;
  
  console.log(`\nTest 2 - PR: ${test2Title}`);
  const questions2 = await generateQuestions(test2Title, test2Diff);
  console.log("Questions:");
  questions2.forEach((q, i) => console.log(`${i + 1}. ${q}`));
  if (questions2.length === 3) {
      console.log("✅ PASS: Generated exactly 3 questions.");
  } else {
      console.log("❌ FAIL: Did not generate exactly 3 questions.");
  }

  console.log("\n=== Testing summarizeTranscript ===");
  const testQuestions = [
    "Why use optional chaining here?",
    "Did you consider using a default parameter?",
    "What happens if user is undefined?"
  ];
  const testAnswers = [
    "It prevents the app from crashing if the profile object is missing.",
    "A default parameter wouldn't help if the object itself is passed but nested properties are missing.",
    "The optional chaining handles undefined user as well, returning 'Anonymous'."
  ];
  
  console.log("Generating summary...");
  const summary = await summarizeTranscript(testQuestions, testAnswers);
  console.log("\nSummary output:\n" + summary);
  if (summary && summary.length > 0) {
      console.log("\n✅ PASS: Generated a summary.");
  } else {
      console.log("\n❌ FAIL: Summary is empty.");
  }

  console.log("\n=== Testing Day-2 Pipeline (End-to-End) ===");
  console.log("1. Faking an interview submission...");
  const fakeMetadata = {
    pr_url: "https://github.com/org/repo/pull/123",
    pr_title: "Refactor database connection pool",
    repo: "org/repo",
    files_changed: ["src/auth.js", "config/db.js"],
    author: "alice_dev",
    timestamp: new Date().toISOString(),
    importance_score: 8,
    trigger_reason: "High complexity PR",
    interview_questions: ["Why refactor this?", "What were alternatives?", "Any risks?"],
    raw_transcript: "Q: Why refactor this?\nA: We were leaking connections.\nQ: What were alternatives?\nA: Doing it per request, but that is too slow.\nQ: Any risks?\nA: Maybe timeouts need tweaking.",
    tags: ["database", "performance"]
  };

  console.log("2. Generating summary...");
  const pipelineSummary = await summarizeTranscript(fakeMetadata.interview_questions, ["We were leaking connections.", "Doing it per request, but that is too slow.", "Maybe timeouts need tweaking."]);
  
  console.log("3. Generating embeddings...");
  const pipelineVector = await embedSummary(pipelineSummary);

  console.log("4. Building decision record...");
  const decisionRecord = buildDecisionRecord({
    ...fakeMetadata,
    ai_summary: pipelineSummary,
    embedding_vector: pipelineVector
  });

  console.log("5. Storing decision in ChromaDB stub...");
  await store_decision(decisionRecord);

  console.log("\nStored Record (Summary):");
  console.log(JSON.stringify({
    ...decisionRecord,
    embedding_vector: `[Array of ${decisionRecord.embedding_vector.length} numbers]`
  }, null, 2));

  if (decisionRecord.embedding_vector.length > 0 && decisionRecord.ai_summary) {
    console.log("✅ PASS: Pipeline stored successfully.");
  } else {
    console.log("❌ FAIL: Pipeline failed to generate vector or summary.");
  }

  console.log("\n=== Testing generateAnswer ===");
  console.log("1. Testing with fake decision context...");
  const answerWithContext = await generateAnswer("Why did we refactor the connection pool?", [decisionRecord]);
  console.log("Answer:", answerWithContext);

  console.log("\n2. Testing with empty context...");
  const answerEmpty = await generateAnswer("Why did we refactor the connection pool?", []);
  console.log("Answer:", answerEmpty);
}

runTests().catch(err => {
    console.error("Test harness failed:", err);
});
