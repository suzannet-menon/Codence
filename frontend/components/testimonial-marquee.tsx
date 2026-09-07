import { testimonials, type Testimonial } from "@/lib/testimonials";

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="w-80 shrink-0 rounded-2xl border border-[var(--card-border)] bg-white p-6">
      <p className="text-base leading-7 text-[var(--foreground)]">
        &ldquo;{testimonial.quote}&rdquo;
      </p>
      <div className="mt-5 flex items-center justify-between border-t border-[var(--card-border)] pt-4">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{testimonial.name}</p>
          <p className="text-xs text-[var(--muted)]">{testimonial.role}</p>
        </div>
        <p className="font-mono text-xs text-[var(--accent)]">{testimonial.repo}</p>
      </div>
    </div>
  );
}

export function TestimonialMarquee() {
  const track = [...testimonials, ...testimonials];

  return (
    <div className="marquee-viewport">
      <div className="marquee-track">
        {track.map((testimonial, index) => (
          <TestimonialCard key={index} testimonial={testimonial} />
        ))}
      </div>
    </div>
  );
}
