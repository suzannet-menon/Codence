"use client";

import { motion } from "motion/react";
import React from "react";

// Adapted from Skiper UI's skiper58 (https://skiper-ui.com), by gxuri.
// Ported to this project's existing `motion/react` dependency instead of
// framer-motion, and without the shadcn `cn` utility (not used elsewhere
// in this codebase) — plain class concatenation instead.
function joinClassNames(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

const STAGGER = 0.035;

// A plain space character rendered inside its own `inline-block` span
// collapses to zero width in the browser, which is what was swallowing the
// spaces between words ("Speakit.don'ttypeit"). A non-breaking space keeps
// its width in that context.
function renderChar(char: string) {
  return char === " " ? " " : char;
}

// Hover-triggered text roll: two stacked copies of the text, one rolling up
// out of view and a second rolling up into place from below. Purely a hover
// interaction — nothing animates on mount.
//
// This only works for text that renders on a single line: the show/hide
// math assumes each duplicate is exactly one line tall, so wrapped text
// overlaps instead of hiding. whitespace-nowrap makes that failure mode
// visible (overflowing text) instead of silent (overlapping duplicates) —
// only use this component where the content is guaranteed to stay short.
export const TextRoll: React.FC<{
  children: string;
  className?: string;
  center?: boolean;
}> = ({ children, className, center = false }) => {
  return (
    <motion.span
      initial="initial"
      whileHover="hovered"
      className={joinClassNames("relative inline-block overflow-hidden whitespace-nowrap", className)}
      style={{
        // A tighter line-height (e.g. 0.75) clips the box below the glyphs'
        // natural height, so descenders (y, g, p) poke past the clip edge
        // and bleed into the other row during the roll. A full line-height
        // keeps each row's box tall enough to contain the whole glyph.
        lineHeight: 1
      }}
    >
      <div>
        {children.split("").map((l, i) => {
          const delay = center
            ? STAGGER * Math.abs(i - (children.length - 1) / 2)
            : STAGGER * i;

          return (
            <motion.span
              variants={{
                initial: {
                  y: 0
                },
                hovered: {
                  // Slightly past -100% so the outgoing glyph's ink fully
                  // clears the clip edge instead of sitting exactly flush
                  // with it — an exact 100% touch left a hairline sliver of
                  // the other row visible from anti-aliasing at the seam.
                  y: "-110%"
                }
              }}
              transition={{
                ease: "easeInOut",
                delay
              }}
              className="inline-block"
              key={i}
            >
              {renderChar(l)}
            </motion.span>
          );
        })}
      </div>
      <div className="absolute inset-0">
        {children.split("").map((l, i) => {
          const delay = center
            ? STAGGER * Math.abs(i - (children.length - 1) / 2)
            : STAGGER * i;

          return (
            <motion.span
              variants={{
                initial: {
                  y: "110%"
                },
                hovered: {
                  y: 0
                }
              }}
              transition={{
                ease: "easeInOut",
                delay
              }}
              className="inline-block"
              key={i}
            >
              {renderChar(l)}
            </motion.span>
          );
        })}
      </div>
    </motion.span>
  );
};
