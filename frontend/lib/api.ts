export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = 6000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }
    });

    if (!res.ok) {
      throw new ApiError(`Request to ${path} failed with status ${res.status}`, res.status);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export type InterviewQuestionsResponse = {
  prTitle: string;
  prUrl?: string;
  questions: string[];
};

// The real backend nests PR metadata under `pr` (see backend/controllers/
// interviewController.js), not flat prTitle/prUrl as originally assumed
// when this frontend was built standalone. Normalizing here keeps every
// consumer of fetchInterview() on the simple flat shape.
type RawInterviewResponse = {
  pr?: { title?: string; url?: string };
  questions: string[];
};

export type InterviewSubmitPayload = {
  questions: string[];
  answers: string[];
};

export type ConnectRepoPayload = {
  token: string;
  repo: string;
};

export type ChatCitation = {
  prUrl?: string;
  prTitle: string;
  author: string;
  date: string;
};

export type ChatResponse = {
  answer: string;
  citations: ChatCitation[];
};

export async function fetchInterview(id: string): Promise<InterviewQuestionsResponse> {
  const data = await request<RawInterviewResponse>(`/interview/${id}`);
  return {
    prTitle: data.pr?.title ?? "Untitled pull request",
    prUrl: data.pr?.url,
    questions: data.questions
  };
}

export function submitInterview(id: string, payload: InterviewSubmitPayload) {
  return request<{ success: boolean }>(`/interview/${id}/submit`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function connectRepo(payload: ConnectRepoPayload) {
  return request<{ success: boolean }>(`/connect`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function askChat(query: string) {
  return request<ChatResponse>(`/chat`, {
    method: "POST",
    body: JSON.stringify({ query })
  });
}
