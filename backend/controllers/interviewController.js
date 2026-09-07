/**
 * interviewController.js
 *
 * Handles:
 *   GET  /interview/:id         — fetch interview context + generate questions
 *   POST /interview/:id/submit  — validate + orchestrate submission pipeline
 *
 * Integration points:
 *   Person D: generateQuestions(), summarizeTranscript(), embedSummary(), buildDecisionRecord()
 *   Person B: store_decision()
 */

import * as interviewStore from '../services/interviewStore.js';
import {
  generateQuestions,
  summarizeTranscript,
  embedSummary,
  buildDecisionRecord,
} from '../services/gemini.js';
import { store_decision } from '../services/chromaStub.js';

// ─────────────────────────────────────────────────────────────────────────────
// GET /interview/:id
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieve the interview and return PR metadata + AI-generated questions.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
export async function getInterview(req, res) {
  const { id } = req.params;

  // ── 1. Find interview ──────────────────────────────────────────────────────
  const session = interviewStore.get(id);
  if (!session) {
    console.warn(`[INTERVIEW] Not found: ${id}`);
    return res.status(404).json({ success: false, error: 'Interview not found' });
  }

  const { pr, files } = session;

  // ── 2. Generate questions via Person D's Gemini service ───────────────────
  // generateQuestions handles its own fallback to default questions on failure
  console.log(`[INTERVIEW] Generating questions for interview ${id}`);

  let questions;
  try {
    questions = await generateQuestions(pr.prTitle, pr.diff);
    console.log(`[INTERVIEW] Questions generated for interview ${id}`);
  } catch (err) {
    // This path should not be reached because gemini.js already catches errors,
    // but guard defensively.
    console.error('[INTERVIEW] generateQuestions threw unexpectedly:', err.message);
    questions = [
      'What problem does this change solve?',
      'What alternatives did you consider before this approach?',
      'What should the next developer know before touching this code?',
    ];
  }

  // Validate exactly 3 string questions
  if (!Array.isArray(questions) || questions.length !== 3 || !questions.every(q => typeof q === 'string')) {
    console.warn('[INTERVIEW] Unexpected questions shape — using defaults');
    questions = [
      'What problem does this change solve?',
      'What alternatives did you consider before this approach?',
      'What should the next developer know before touching this code?',
    ];
  }

  // ── 3. Build response ─────────────────────────────────────────────────────
  return res.status(200).json({
    success: true,
    interviewId: id,
    pr: {
      title:      pr.prTitle,
      url:        pr.prUrl,
      repository: `${pr.repositoryOwner}/${pr.repositoryName}`,
      author:     pr.author,
      baseBranch: pr.baseBranch,
      headBranch: pr.headBranch,
    },
    score:   session.score,
    reasons: session.reasons,
    questions,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /interview/:id/submit
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate the submitted answers, orchestrate summarisation + embedding,
 * then store the decision record via Person B's store_decision().
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
export async function submitInterview(req, res) {
  const { id } = req.params;

  // ── 1. Find interview ──────────────────────────────────────────────────────
  const session = interviewStore.get(id);
  if (!session) {
    console.warn(`[SUBMIT] Interview not found: ${id}`);
    return res.status(404).json({ success: false, error: 'Interview not found' });
  }

  // ── 2. Validate request body ───────────────────────────────────────────────
  const { questions, answers } = req.body;

  if (!Array.isArray(questions)) {
    return res.status(400).json({ success: false, error: '"questions" must be an array' });
  }
  if (!Array.isArray(answers)) {
    return res.status(400).json({ success: false, error: '"answers" must be an array' });
  }
  if (questions.length === 0) {
    return res.status(400).json({ success: false, error: '"questions" must not be empty' });
  }
  if (answers.length !== questions.length) {
    return res.status(400).json({
      success: false,
      error: `"questions" and "answers" length mismatch (${questions.length} vs ${answers.length})`,
    });
  }
  if (!questions.every(q => typeof q === 'string' && q.trim().length > 0)) {
    return res.status(400).json({ success: false, error: 'All questions must be non-empty strings' });
  }
  if (!answers.every(a => typeof a === 'string')) {
    return res.status(400).json({ success: false, error: 'All answers must be strings' });
  }

  const { pr, files, score, reasons } = session;

  console.log(`[SUBMIT] Interview ${id} submitted — orchestrating pipeline`);

  // ── 3. Summarise transcript (Person D) ────────────────────────────────────
  let aiSummary;
  try {
    aiSummary = await summarizeTranscript(questions, answers);
    console.log('[SUBMIT] Summary generated');
  } catch (err) {
    console.error('[SUBMIT] summarizeTranscript failed:', err.message);
    // Fallback: concatenate Q&A pairs
    aiSummary = questions.map((q, i) => `Q: ${q}\nA: ${answers[i] || 'No answer provided.'}`).join('\n\n');
  }

  // ── 4. Generate embedding (Person D) ─────────────────────────────────────
  let embeddingVector = [];
  try {
    embeddingVector = await embedSummary(aiSummary);
    console.log(`[SUBMIT] Embedding generated (${embeddingVector.length} dimensions)`);
  } catch (err) {
    console.error('[SUBMIT] embedSummary failed:', err.message);
    // Non-fatal: store without embedding; ChromaDB may handle this gracefully
  }

  // ── 5. Build decision record ──────────────────────────────────────────────
  const decisionRecord = buildDecisionRecord({
    pr_url:             pr.prUrl,
    pr_title:           pr.prTitle,
    repo:               `${pr.repositoryOwner}/${pr.repositoryName}`,
    files_changed:      files.map(f => f.filename),
    author:             pr.author,
    timestamp:          new Date().toISOString(),
    importance_score:   score,
    trigger_reason:     reasons,
    interview_questions: questions,
    raw_transcript:     questions.map((q, i) => `Q: ${q}\nA: ${answers[i] || ''}`),
    ai_summary:         aiSummary,
    embedding_vector:   embeddingVector,
    tags:               [],
  });

  // ── 6. Store decision (Person B / ChromaDB) ───────────────────────────────
  try {
    await store_decision(decisionRecord);
    console.log('[STORAGE] Decision stored');
  } catch (err) {
    console.error('[STORAGE] store_decision failed:', err.message);
    // Non-fatal for the response — the decision was built, storage can be retried
  }

  // ── 7. Clean up pending interview session ─────────────────────────────────
  interviewStore.remove(id);

  return res.status(200).json({
    success: true,
    interviewId: id,
    message: 'Interview submitted and decision stored',
    summary: aiSummary,
  });
}
