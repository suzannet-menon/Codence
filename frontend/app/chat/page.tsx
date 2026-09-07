"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { askChat, ChatCitation } from "@/lib/api";
import { searchSeededDecisions } from "@/lib/seeded-decisions";
import { ChatInput } from "@/components/ChatInput";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
};

const SUGGESTED_QUESTIONS = [
  "Why did we change payment retry handling?",
  "Why did we migrate the auth provider?",
  "Why does Codence score every PR?"
];

function answerFromSeeds(query: string): { content: string; citations: ChatCitation[] } {
  const matches = searchSeededDecisions(query);
  if (matches.length === 0) {
    return {
      content: "No recorded decision found for this query.",
      citations: []
    };
  }
  const content = matches.map((decision) => decision.summary).join(" ");
  return {
    content,
    citations: matches.map((decision) => ({
      prUrl: decision.prUrl,
      prTitle: decision.prTitle,
      author: decision.author,
      date: decision.date
    }))
  };
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  async function sendQuery(query: string) {
    const trimmed = query.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const response = await askChat(trimmed);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: response.answer, citations: response.citations }
      ]);
    } catch {
      // No backend reachable yet — fall back to a small local, keyword-matched
      // decision set so the RAG-chat experience is still demoable offline.
      setDemoMode(true);
      const fallback = answerFromSeeds(trimmed);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: fallback.content, citations: fallback.citations }
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
      <section className="fade-up mx-auto max-w-3xl pt-8 pb-10 text-center lg:pt-10">
        <p className="text-sm uppercase tracking-[0.34em] text-[var(--accent-strong)]">RAG Chat</p>
        <h1 className="mt-6 text-3xl font-semibold leading-[1.1] text-[var(--foreground)] sm:text-4xl sm:leading-[1.05] md:text-5xl lg:text-7xl">
          Ask why.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)] lg:text-xl">
          Every answer is grounded in stored decisions and cited by PR, author, and date.
          {demoMode && " Currently answering from a local demo dataset. Connect the backend for live data."}
        </p>
      </section>

      <div className="fade-up-delay flex min-h-[60vh] flex-col rounded-[2rem] border border-[var(--card-border)] bg-[var(--card)] p-6 pb-16 shadow-[var(--shadow)] lg:p-8">
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="fade-up-delay flex flex-1 items-center justify-center">
              <div className="group relative overflow-hidden w-full max-w-3xl rounded-[1.75rem] border border-dashed border-[var(--card-border)] bg-white/80 p-8 text-center">
                <span className="hover-glow wash-sky-mint" aria-hidden />
                <p className="relative z-[1] text-sm uppercase tracking-[0.28em] text-[var(--muted)]">Empty state</p>
                <h2 className="relative z-[1] mt-3 text-3xl font-semibold text-[var(--foreground)]">
                  No decision retrieved yet
                </h2>
                <p className="relative z-[1] mt-4 text-base leading-7 text-[var(--muted)]">
                  Ask a grounded question like the ones below and Codence will respond with
                  cited decisions from stored PR interviews.
                </p>

                <div className="relative z-[1] mt-6 grid gap-3 text-left">
                  {SUGGESTED_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => void sendQuery(question)}
                      className="rounded-2xl bg-[#f9f6f0] px-4 py-3 text-left text-sm text-[var(--foreground)] transition hover:bg-[var(--accent-soft)]"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-2xl rounded-[1.5rem] px-5 py-4 text-base leading-7 ${
                      message.role === "user"
                        ? "bg-[var(--foreground)] text-white"
                        : "border border-[var(--card-border)] bg-white/90 text-[var(--foreground)]"
                    }`}
                  >
                    <p>{message.content}</p>
                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-4 grid gap-2">
                        {message.citations.map((citation, index) => (
                          <a
                            key={index}
                            href={citation.prUrl ?? "#"}
                            target={citation.prUrl ? "_blank" : undefined}
                            rel={citation.prUrl ? "noreferrer" : undefined}
                            className="rounded-xl bg-[#f9f6f0] px-3 py-2 font-mono text-xs text-[var(--accent-strong)] transition hover:bg-[var(--accent-soft)]"
                          >
                            {citation.prTitle} · {citation.author} · {citation.date}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-[1.5rem] border border-[var(--card-border)] bg-white/90 px-5 py-4">
                    <span className="typing-dot" />
                    <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
                    <span className="typing-dot" style={{ animationDelay: "0.3s" }} />
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </>
          )}
        </div>

        <div className="fade-up-delay-2 mt-auto pt-6">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={(query) => void sendQuery(query)}
            disabled={isSending}
            placeholder="Ask why a change was made, what tradeoffs were considered, or what risk was noted..."
          />
        </div>
      </div>
    </div>
  );
}
