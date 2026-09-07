"use client";

import { FormEvent, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

// A short, synthesized "sent" blip via Web Audio API — no audio asset to
// ship or host, and it fails silently if the browser blocks/lacks audio.
function playSendSound() {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(560, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
    osc.onended = () => ctx.close();
  } catch {
    // Sound is a nicety, never worth blocking the send on.
  }
}

const ARROW_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="6 11 12 5 18 11" />
  </svg>
);

const CHECK_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// Minimalist chat input: a colorful gradient burst sweeps behind the send
// button, and the arrow icon morphs into a checkmark, on every send.
export function ChatInput({ value, onChange, onSend, disabled, placeholder }: ChatInputProps) {
  const [justSent, setJustSent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    playSendSound();
    setJustSent(true);
    window.setTimeout(() => setJustSent(false), 600);
    onSend(trimmed);
  }

  const canSend = !disabled && value.trim().length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-white/90 p-2 pl-5 transition focus-within:border-[var(--accent)] focus-within:ring-4 focus-within:ring-[var(--accent-soft)]"
    >
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-10 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--muted)]"
      />
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Send message"
        className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--foreground)] text-white transition disabled:cursor-not-allowed disabled:opacity-40"
      >
        <AnimatePresence>
          {justSent && (
            <motion.span
              key="burst"
              aria-hidden
              className="pointer-events-none absolute inset-[-45%] rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, var(--wash-coral), var(--wash-gold), var(--wash-mint), var(--wash-sky), var(--wash-coral))"
              }}
              initial={{ opacity: 0, rotate: 0, scale: 0.4 }}
              animate={{ opacity: [0, 0.9, 0], rotate: 220, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>

        <span className="relative z-[1] flex h-4 w-4 items-center justify-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={justSent ? "check" : "arrow"}
              initial={{ opacity: 0, rotate: -45, scale: 0.6 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 45, scale: 0.6 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {justSent ? CHECK_ICON : ARROW_ICON}
            </motion.span>
          </AnimatePresence>
        </span>
      </button>
    </form>
  );
}
