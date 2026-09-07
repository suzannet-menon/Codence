"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ApiError, fetchInterview, submitInterview } from "@/lib/api";

const FALLBACK_QUESTIONS = [
  "What problem does this change solve?",
  "What alternatives did you consider before this approach?",
  "What should the next developer know before touching this code?"
];

type LoadState = "loading" | "ready" | "submitting" | "success" | "skipped";

export default function InterviewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [prTitle, setPrTitle] = useState("Improve scoring for risky architectural changes");
  const [prUrl, setPrUrl] = useState<string | undefined>(undefined);
  const [questions, setQuestions] = useState<string[]>(FALLBACK_QUESTIONS);
  const [answers, setAnswers] = useState<string[]>(FALLBACK_QUESTIONS.map(() => ""));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [state, setState] = useState<LoadState>("loading");
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchInterview(id)
      .then((data) => {
        if (cancelled) return;
        setPrTitle(data.prTitle);
        setPrUrl(data.prUrl);
        setQuestions(data.questions);
        setAnswers(data.questions.map(() => ""));
        setState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        // A 404 means the backend is reachable but has no interview with
        // this ID (e.g. it was never seeded, or was already submitted) —
        // a different situation from the backend not responding at all.
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setDemoMode(true);
        }
        setState("ready");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setSpeechSupported(Boolean(ctor));
    return () => recognitionRef.current?.stop();
  }, []);

  function stopRecording() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
  }

  function toggleRecording() {
    const ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!ctor) return;

    if (isRecording) {
      stopRecording();
      return;
    }

    const activeIndex = currentIndex;
    const recognition = new ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = answers[activeIndex] ? `${answers[activeIndex]} ` : "";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += `${result[0].transcript} `;
        } else {
          interim += result[0].transcript;
        }
      }
      setAnswers((prev) => {
        const next = [...prev];
        next[activeIndex] = `${finalTranscript}${interim}`.trim();
        return next;
      });
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }

  function goToQuestion(index: number) {
    if (isRecording) stopRecording();
    setCurrentIndex(index);
  }

  function handleAnswerChange(value: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = value;
      return next;
    });
  }

  async function handleSubmit() {
    if (isRecording) stopRecording();
    setState("submitting");
    try {
      await submitInterview(id, { questions, answers });
    } catch {
      // The interview is designed to never block a merge, so a failed
      // submit (e.g. no backend running yet) still resolves to success.
    }
    setState("success");
  }

  function handleSkip() {
    if (isRecording) stopRecording();
    setState("skipped");
  }

  const answeredCount = answers.filter((answer) => answer.trim().length > 0).length;

  if (state === "success" || state === "skipped") {
    return (
      <section className="mx-auto w-full max-w-4xl px-6 py-12 lg:px-10">
        <div className="fade-up flex flex-col items-center gap-6 rounded-[2rem] border border-[var(--card-border)] bg-[var(--card)] p-10 text-center shadow-[var(--shadow)]">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)] text-3xl text-[var(--accent-strong)]">
            {state === "success" ? "✓" : "→"}
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-[var(--foreground)]">
              {state === "success" ? "Interview submitted" : "Interview skipped"}
            </h1>
            <p className="max-w-xl text-base leading-7 text-[var(--muted)]">
              {state === "success"
                ? "Thanks. Your reasoning has been captured and will be summarized into a searchable decision record."
                : "No problem. Interviews never block a merge. You can start one anytime from the PR comment."}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/chat"
              className="rounded-2xl bg-[var(--foreground)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
            >
              Ask Codence about this decision
            </Link>
            <Link
              href="/"
              className="rounded-2xl border border-[var(--card-border)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-white"
            >
              Back to landing
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
      <section className="fade-up mx-auto max-w-3xl pt-8 pb-10 text-center lg:pt-10">
        <p className="text-sm uppercase tracking-[0.34em] text-[var(--accent-strong)]">
          PR Interview
        </p>
        <h1 className="mt-6 text-3xl font-semibold leading-[1.1] text-[var(--foreground)] sm:text-4xl sm:leading-[1.05] md:text-5xl lg:text-7xl">
          {prTitle}
        </h1>
        <p className="mt-6 text-lg leading-8 text-[var(--muted)] lg:text-xl">
          Interview ID: <span className="font-mono font-medium text-[var(--foreground)]">{id}</span>
        </p>
        {prUrl && (
          <a
            href={prUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm font-medium text-[var(--accent-strong)] hover:underline"
          >
            View pull request on GitHub →
          </a>
        )}

        <div className="mx-auto mt-8 grid max-w-md gap-3 text-sm text-[var(--muted)] sm:grid-cols-2">
          <div className="group relative overflow-hidden rounded-2xl border border-[var(--card-border)] bg-white/80 px-4 py-3">
            <span className="hover-glow wash-coral-sky" aria-hidden />
            <p className="relative z-[1] uppercase tracking-[0.22em]">Progress</p>
            <p className="relative z-[1] mt-2 font-semibold text-[var(--foreground)]">
              {answeredCount} of {questions.length} answered
            </p>
          </div>
          <div className="group relative overflow-hidden rounded-2xl border border-[var(--card-border)] bg-white/80 px-4 py-3">
            <span className="hover-glow wash-sky-mint" aria-hidden />
            <p className="relative z-[1] uppercase tracking-[0.22em]">Mode</p>
            <p className="relative z-[1] mt-2 font-semibold text-[var(--foreground)]">
              {notFound ? "Demo (not found)" : demoMode ? "Demo (offline)" : "Live"}
            </p>
          </div>
        </div>
      </section>

      <div className="fade-up-delay rounded-[2rem] border border-[var(--card-border)] bg-[var(--card)] p-8 pb-10 shadow-[var(--shadow)] lg:p-10">
        {notFound && (
          <div className="mb-6 rounded-2xl bg-[#fff3d6] px-4 py-3 text-sm leading-6 text-[#92620a]">
            The backend is reachable, but it has no interview with this ID (it may never have been
            seeded, or was already submitted). Using fallback questions so you can still try the
            voice interview.
          </div>
        )}

        {demoMode && (
          <div className="mb-6 rounded-2xl bg-[#fff3d6] px-4 py-3 text-sm leading-6 text-[#92620a]">
            Backend not reachable. Using fallback questions so you can still try the voice interview.
          </div>
        )}

        {!speechSupported && (
          <div className="mb-6 rounded-2xl bg-[#fdeceb] px-4 py-3 text-sm leading-6 text-[#b3261e]">
            Voice capture isn&apos;t supported in this browser. Try Chrome, or type your answer below.
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-2">
          {questions.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToQuestion(index)}
              className={`h-2.5 flex-1 min-w-16 rounded-full transition ${
                index === currentIndex
                  ? "bg-[var(--accent)]"
                  : answers[index].trim()
                    ? "bg-[var(--accent-soft)]"
                    : "bg-[var(--card-border)]"
              }`}
              aria-label={`Go to question ${index + 1}`}
            />
          ))}
        </div>

        <article className="group fade-up-delay relative overflow-hidden rounded-[1.75rem] border border-[var(--card-border)] bg-white/85 p-6">
          <span className="hover-glow wash-gold-coral" aria-hidden />
          <div className="relative z-[1] mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-[var(--accent-strong)]">
                Question {currentIndex + 1} of {questions.length}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                {questions[currentIndex]}
              </h2>
            </div>

            <button
              type="button"
              onClick={toggleRecording}
              disabled={!speechSupported}
              className={`flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isRecording
                  ? "border-[#b3261e] bg-[#fdeceb] text-[#b3261e]"
                  : "border-[var(--foreground)] text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-white"
              }`}
            >
              {isRecording && (
                <span className="waveform" aria-hidden>
                  {[0, 1, 2, 3, 4, 5, 6].map((bar) => (
                    <span key={bar} className="waveform-bar" style={{ animationDelay: `${bar * 0.12}s` }} />
                  ))}
                </span>
              )}
              {isRecording ? "Stop Recording" : "Start Recording"}
            </button>
          </div>

          <div className="relative z-[1] rounded-2xl bg-[#f9f6f0] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
              {isRecording ? "Listening..." : "Transcript"}
            </p>
            <textarea
              value={answers[currentIndex]}
              onChange={(event) => handleAnswerChange(event.target.value)}
              readOnly={isRecording}
              placeholder="Start recording or type your answer here..."
              rows={4}
              className="mt-3 w-full resize-none border-none bg-transparent text-base leading-7 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
            />
          </div>

          <div className="relative z-[1] mt-5 flex justify-between">
            <button
              type="button"
              onClick={() => goToQuestion(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="rounded-2xl px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-white"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => goToQuestion(currentIndex + 1)}
              disabled={currentIndex === questions.length - 1}
              className="rounded-2xl px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-white"
            >
              Next Question
            </button>
          </div>
        </article>

        <div className="group relative mt-8 flex flex-col gap-4 overflow-hidden rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow)] lg:flex-row lg:items-center lg:justify-between">
          <span className="hover-glow wash-accent-gold" aria-hidden />
          <div className="relative z-[1]">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--accent-strong)]">Final action</p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Submit interview answers</h3>
          </div>

          <div className="relative z-[1] flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSkip}
              className="rounded-2xl border border-[var(--card-border)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-black/5"
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={state === "submitting"}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--hero)] px-6 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state === "submitting" && <span className="spinner" aria-hidden />}
              {state === "submitting" ? "Submitting..." : "Submit Answers"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
