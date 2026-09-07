"use client";

import { motion } from "motion/react";

type RollingTextProps = {
  text: string;
  className?: string;
  /** Delay between each character's roll-in, in milliseconds. */
  staggerMs?: number;
};

// One-time entrance animation: each character rolls up into place
// (rotateX + fade) staggered left to right, on mount. Not scroll-linked —
// used for the hero headline, which is visible immediately on load rather
// than scrolled into view.
export function RollingText({ text, className = "", staggerMs = 16 }: RollingTextProps) {
  const words = text.split(" ");
  let charIndex = 0;

  return (
    <span className={className}>
      {words.map((word, wordIndex) => (
        <span key={wordIndex}>
          <span style={{ display: "inline-block", perspective: "600px", whiteSpace: "nowrap" }}>
            {word.split("").map((char, charInWord) => {
              const delay = charIndex * staggerMs;
              charIndex += 1;
              return (
                <motion.span
                  key={charInWord}
                  style={{ display: "inline-block", transformStyle: "preserve-3d" }}
                  initial={{ opacity: 0, rotateX: 70, y: 14 }}
                  animate={{ opacity: 1, rotateX: 0, y: 0 }}
                  transition={{ duration: 0.5, delay: delay / 1000, ease: [0.16, 1, 0.3, 1] }}
                >
                  {char}
                </motion.span>
              );
            })}
          </span>
          {wordIndex < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}
