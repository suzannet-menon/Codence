export async function store_decision(decisionObject) {
  // TODO(Person B / Suzanne): replace this whole file with the real ChromaDB-backed services/chroma.js — same function signature.
  console.log("\n[ChromaStub] Storing decision:");
  console.log(`- PR URL: ${decisionObject.pr_url}`);
  console.log(`- Title: ${decisionObject.pr_title}`);
  console.log(`- Repo: ${decisionObject.repo}`);
  console.log(`- Author: ${decisionObject.author}`);
  console.log(`- Vector length: ${decisionObject.embedding_vector ? decisionObject.embedding_vector.length : 0}`);
  
  // Just pushing into a local array in memory
  if (!global.mockChromaStore) {
    global.mockChromaStore = [];
  }
  global.mockChromaStore.push(decisionObject);
}
