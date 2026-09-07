# Codence — session context

Paste this file into a new chat (or point Claude at it) to pick up exactly where this session left off.

## What this project is

**Codence** (renamed from an earlier "MetaWiz AI" working title) is a hackathon project: *"GitHub remembers what changed. Codence remembers why."* It captures the reasoning behind a pull request via a short voice interview at merge time, stores it, and lets the team later ask "why is this code like this?" in a RAG-style chat and get a grounded, cited answer.

- **Team**: Meghana (that's the user in this chat — Person C, Frontend), Aryan, Suzanne, Ruchira.
- **Team plan split**: Person A = backend foundation, Person B = importance-scoring logic, Person C = frontend (everything in this session), Person D = AI/Gemini layer.
- **This session's scope**: entirely frontend. No backend exists in this repo yet — the frontend is built to work standalone with graceful offline/demo fallbacks, and to call real endpoints once the backend exists.

## Repo / environment

- Path: `C:\Users\Asus\OneDrive\Documents\ChatGPT\New project\Codence`
- GitHub remote: `https://github.com/aryanfulari/Codence.git`
- Working branch: **`frontend/person-c-functionality`** (branched off `main`, not merged back yet)
- Frontend app lives in `frontend/` — Next.js 15.4.6 (App Router), React 19, TypeScript, Tailwind CSS v4
- Dev server: `cd frontend && npm run dev` (or `npm --prefix frontend run dev` from repo root)
- `.claude/launch.json` has `autoPort: true` so Claude's preview tool won't collide with a manually-run `npm run dev` on port 3000
- **Known gotcha**: after big changes (fonts, theme), the Next.js `.next` dev cache can go stale and throw `X is not defined` or spurious 404s on dynamic routes. Fix: delete `frontend/.next` and restart the dev server.

## Design system (locked in — reuse these tokens, don't introduce new ones ad hoc)

All defined in `frontend/app/globals.css` under `:root`:

| Token | Value | Use |
|---|---|---|
| `--background` | `#f5f4f2` | page background (warm light gray) |
| `--foreground` | `#16150f` | primary text |
| `--card` | `#ffffff` | card surfaces |
| `--card-border` | `rgba(22,21,15,0.1)` | hairline borders |
| `--accent` | `#b45309` | amber — eyebrows, buttons, chips, focus rings |
| `--accent-strong` | `#92400e` | amber hover/darker |
| `--accent-soft` | `#fef3c7` | amber tint backgrounds |
| `--hero` | `#fbbf24` | one special CTA (interview submit button) |
| recording red | `#b3261e` | recording indicators (pulse dot, waveform, stop button) — not a CSS var, used as a literal hex consistently |

Fonts (loaded via `next/font/google` in `frontend/app/layout.tsx`):
- `--font-display`: **Space Grotesk** — all headings (bold geometric sans, replaced an earlier Fraunces/serif direction)
- `--font-sans`: **Inter** — body/UI/nav
- `--font-mono`: **JetBrains Mono** — technical details: window-chrome address bars, interview IDs, PR citation chips

Style reference chosen: **Cursor.com** (cream/near-black, elegant sans headline, framed product-screenshot mockups). Round.ai and Adora were considered but not used. Background was later flattened from cream to light gray per user request so white cards visually "pop."

Logo mark: `frontend/components/codence-mark.tsx` — an open "C" ring capped with a solid **red** dot where it opens (styled like a record button, nods to the voice-interview feature). Used in the header and as `frontend/app/icon.svg` (favicon).

## What's built, page by page

### `frontend/app/page.tsx` — Landing page
Top to bottom:
1. **Hero** (centered, huge): eyebrow "Institutional memory, automated" → headline "The reasoning behind your code. Remembered, not lost." → subtitle.
2. **Repo-connect card**: functional form (Personal Access Token + repo name), validates format, `POST /connect`, falls back to a "demo" saved-locally state if the backend isn't reachable. Wrapped in `TiltWrapper` so it tilts in 3D on mouse hover. Window-chrome styling (traffic-light dots + `codence.app/connect` address bar).
3. **"Why Codence" feature section**: 3 cards, each with a small mockup of the *actual* feature (not stock art) that fades into the card via a `.feature-mockup-mask` gradient mask, then a title + description below:
   - **Speak it, don't type it** — mini interview-question mockup with an animated 7-bar waveform (staggered `waveformPulse` CSS animation) + "Recording" pill.
   - **Only the PRs that matter** — mini PR list mockup with amber score badges.
   - **Answers with receipts** — mini chat-answer mockup with a citation chip.
4. **"See it in action"**: a chat mockup (also `TiltWrapper`-wrapped, tilts on hover) showing a sample grounded Q&A with citation. Has `mt-12` spacing above it (was flush before).
5. **Testimonials marquee**: `components/testimonial-marquee.tsx` + `lib/testimonials.ts` — infinite horizontal scroll, pauses on hover, uses clearly fictional names/repos/quotes (Codence has no real customers yet).

### `frontend/app/interview/[id]/page.tsx` — Voice interview flow
Fetches questions from `GET /interview/:id`; falls back to 3 hardcoded questions (matching the backend's own documented fallback) if unreachable — shows a "Demo (offline)" banner in that case. Real **Web Speech API** voice recording per question (`webkitSpeechRecognition`/`SpeechRecognition`), live transcript, progress bar, Previous/Next navigation, Skip and Submit actions (`POST /interview/:id/submit`), success/skip screens. Centered hero-style header (eyebrow/title/ID) matching the landing page pattern.

### `frontend/app/chat/page.tsx` — RAG chat
Posts queries to `POST /chat`; if the backend is unreachable, falls back to `lib/seeded-decisions.ts` — a small local dataset with real keyword-matching (stopword-filtered, whole-word match, not naive substring) so it never falsely matches unrelated questions, and honestly says "No recorded decision found for this query" when nothing matches. Citations rendered as monospace chips.

### `frontend/components/site-header.tsx` — Nav
3-column grid layout (logo / nav / balancing spacer) so the nav pill sits at the true horizontal center regardless of logo width. Active page gets a solid amber pill; inactive links get an amber-tinted hover.

## Supporting files

- `frontend/lib/api.ts` — typed fetch client for the backend contract the frontend expects:
  - `GET /interview/:id` → `{ prTitle, prUrl?, questions: string[] }`
  - `POST /interview/:id/submit` body `{ questions, answers }` → `{ success }`
  - `POST /connect` body `{ token, repo }` → `{ success }`
  - `POST /chat` body `{ query }` → `{ answer, citations }`
  - Base URL: `NEXT_PUBLIC_API_BASE_URL` env var, default `http://localhost:4000` (see `frontend/.env.local.example`)
- `frontend/components/TiltedCard/TiltedCard.tsx` + `.css` — the original React Bits `TiltedCard` (image-based pointer-tilt), installed per user request but **currently unused** on any page (kept in case a real image-based use case comes up).
- `frontend/components/TiltedCard/TiltWrapper.tsx` — the component actually in use: same tilt physics generalized to wrap arbitrary children (real cards) instead of a single `<img>`.

## User preferences / feedback to keep following

- **Don't over-verify visually.** Do a type-check (`npx tsc --noEmit -p tsconfig.json`) and reason about obvious risks (overflow, stale cache); ask the user to check `npm run dev` themselves rather than burning many browser/screenshot tool calls. (This is saved in Claude's persistent memory for this project.)
- **No hyphens or em dashes anywhere in visible on-page copy** — already swept clean once; keep new copy hyphen-free (rephrase into two sentences instead of using a dash).
- Avoid "Person C" framing in commit messages/copy — just describe the work, not the team-plan role.
- Copy/design decisions have generally been made by presenting 3-4 concrete options (with reasoning + a recommendation) and letting the user pick, rather than deciding unilaterally on subjective calls.

## Open items / not done

- No real backend in this repo — nothing here has been tested against a live server, only the offline/demo fallback paths.
- Dark mode: explicitly deferred (light-only for now, by user's choice).
- No accessibility audit, no automated tests.
- Branch `frontend/person-c-functionality` has not been merged into `main` or opened as a PR yet.
