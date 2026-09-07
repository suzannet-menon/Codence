type CodenceMarkProps = {
  size?: number;
  className?: string;
};

// The Codence logo mark: an open "C" ring capped with a solid dot where it
// opens, styled after a record button — a nod to the voice-interview
// feature that captures the "why" behind a PR.
export function CodenceMark({ size = 32, className = "" }: CodenceMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Codence"
    >
      <rect width="100" height="100" rx="22" fill="#16150f" />
      <path
        d="M 68 30 A 26 26 0 1 0 68 70"
        fill="none"
        stroke="#f5f4f2"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle cx="68" cy="30" r="6.5" fill="#b3261e" />
    </svg>
  );
}
