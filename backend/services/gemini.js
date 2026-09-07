import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI();

/**
 * Generates 3 interview questions based on a PR title and diff.
 * @param {string} prTitle - The title of the Pull Request.
 * @param {string} prDiff - The diff content of the Pull Request.
 * @returns {Promise<string[]>} A promise that resolves to an array of exactly 3 strings.
 */
export async function generateQuestions(prTitle, prDiff) {
  const defaultQuestions = [
    "What problem does this change solve?",
    "What alternatives did you consider before this approach?",
    "What should the next developer know before touching this code?"
  ];

  try {
    const prompt = `You are reviewing a GitHub PR titled '${prTitle}'. Based on this diff, generate exactly 3 interview questions to capture the developer's reasoning behind the change. Return ONLY a JSON array of 3 strings, no markdown, no commentary.\n\nDiff:\n${prDiff}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING
                }
            }
        }
    });

    let questions;
    try {
        questions = JSON.parse(response.text);
    } catch (parseError) {
        console.error("PARSE ERROR:", parseError.message, "RAW TEXT:", response.text);
        return defaultQuestions;
    }
    
    if (Array.isArray(questions) && questions.length === 3 && questions.every(q => typeof q === 'string')) {
      return questions;
    } else {
      console.error("VALIDATION FAILED:", questions);
      return defaultQuestions;
    }
  } catch (error) {
    console.error("API ERROR:", error);
    // Silently fallback on failure
    return defaultQuestions;
  }
}

/**
 * Summarizes a developer interview into a structured decision record.
 * @param {string[]} questions - An array of 3 interview questions.
 * @param {string[]} answers - An array of 3 answers corresponding to the questions.
 * @returns {Promise<string>} A promise that resolves to a summary string.
 */
export async function summarizeTranscript(questions, answers) {
  const fallbackSummary = questions.map((q, i) => `Q: ${q}\nA: ${answers[i] || 'No answer provided.'}`).join('\n\n');

  try {
    const qaPairs = questions.map((q, i) => `Question: ${q}\nAnswer: ${answers[i] || ''}`).join('\n\n');
    const prompt = `Summarize this developer interview into a structured decision record: what was decided, why, what alternatives were considered, and what risks were noted. Be concise. Respond in plain prose only, 3-5 complete sentences, no headers, no bullet points, no asterisks, no bold text.\n\n${qaPairs}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt
    });

    if (response.text && typeof response.text === 'string') {
        return response.text.trim();
    }
    return fallbackSummary;
  } catch (error) {
    // Silently fallback on failure
    return fallbackSummary;
  }
}

/**
 * Calls the Gemini embeddings API on the given text.
 * @param {string} summaryText
 * @returns {Promise<number[]>} - The embedding vector for ChromaDB store_decision()
 */
export async function embedSummary(summaryText) {
  try {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: summaryText
    });
    return response.embeddings[0].values;
  } catch (error) {
    console.error("Embedding API ERROR:", error);
    return [];
  }
}

/**
 * Assembles the full decision object that gets stored.
 * @param {Object} fields - The pieces to assemble
 * @param {string[]} fields.files_changed - Array of changed file paths
 * @returns {Object} - The full decision object
 */
export function buildDecisionRecord({
  pr_url,
  pr_title,
  repo,
  files_changed,
  author,
  timestamp,
  importance_score,
  trigger_reason,
  interview_questions,
  raw_transcript,
  ai_summary,
  embedding_vector,
  tags = []
}) {
  return {
    pr_url,
    pr_title,
    repo,
    files_changed,
    author,
    timestamp,
    importance_score,
    trigger_reason,
    interview_questions,
    raw_transcript,
    ai_summary,
    embedding_vector,
    tags
  };
}

/**
 * Generates an answer to a question using retrieved decisions as context.
 * @param {string} question
 * @param {Array} retrievedDecisions
 * @returns {Promise<string>}
 */
export async function generateAnswer(question, retrievedDecisions) {
  if (!retrievedDecisions || retrievedDecisions.length === 0) {
    return "No recorded decision found for this query.";
  }

  const contextStr = retrievedDecisions.map(d => 
    `Decision Summary: ${d.ai_summary}\npr_url: ${d.pr_url}\nauthor: ${d.author}`
  ).join('\n\n');

  const prompt = `Using ONLY the following recorded decisions, answer the question. Cite each source by its PR URL and author. Reproduce the pr_url and author EXACTLY as given, character for character — do not paraphrase or alter URLs. If the decisions don't actually answer the question, say so honestly instead of guessing.\n\nContext:\n${contextStr}\n\nQuestion: ${question}`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt
    });

    if (response.text && typeof response.text === 'string') {
        return response.text.trim();
    }
    return "Could not generate an answer.";
  } catch (error) {
    console.error("generateAnswer API ERROR:", error);
    return "Error generating answer.";
  }
}
