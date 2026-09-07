// Illustrative placeholder quotes for the landing page's social-proof
// marquee. Codence doesn't have real customers yet — every name, role, and
// repo below is fictional, standing in for what this section will hold once
// there's real usage to show.
export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  repo: string;
};

export const testimonials: Testimonial[] = [
  {
    quote: "We stopped losing context every time someone left the team.",
    name: "Priya N.",
    role: "Staff Engineer",
    repo: "northwind/core"
  },
  {
    quote: "The voice interview takes ninety seconds and saves us hours later.",
    name: "Marcus T.",
    role: "Tech Lead",
    repo: "vertex/gateway"
  },
  {
    quote: "Finally, PR reasoning that survives past the sprint it shipped in.",
    name: "Elena R.",
    role: "Engineering Manager",
    repo: "anchorpoint/platform"
  },
  {
    quote: "Our new hires ask Codence instead of pinging senior devs.",
    name: "Sam O.",
    role: "Founding Engineer",
    repo: "lumen/services"
  },
  {
    quote: "It's the only tool that captures why, not just what changed.",
    name: "Diego M.",
    role: "Principal Engineer",
    repo: "fernbridge/monolith"
  },
  {
    quote: "Every risky migration now ships with a recorded rationale.",
    name: "Ayesha K.",
    role: "Platform Lead",
    repo: "orbital/infra"
  }
];
