import Link from "next/link";
import { TiltWrapper } from "@/components/TiltedCard/TiltWrapper";

export default function SignupPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
      <section className="fade-up mx-auto max-w-3xl pt-16 pb-10 text-center lg:pt-20">
        <p className="text-sm uppercase tracking-[0.34em] text-[var(--accent-strong)]">
          Get started
        </p>
        <h1 className="mt-6 text-5xl font-semibold leading-[1.05] text-[var(--foreground)] lg:text-6xl">
          Create your Codence account.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">
          Connect a repo and start capturing the reasoning behind every PR
          in minutes.
        </p>
      </section>

      <section className="fade-up-delay mx-auto max-w-md pb-20 lg:pb-28">
        <TiltWrapper className="rounded-2xl" rotateAmplitude={6} scaleOnHover={1.015}>
          <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-[var(--shadow)]">
            <div className="flex items-center gap-2 border-b border-[var(--card-border)] bg-black/[0.02] px-5 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-2 font-mono text-xs text-[var(--muted)]">codence.app/signup</span>
            </div>

            <div className="p-8 lg:p-10">
              <form className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-[var(--foreground)]">
                    Full name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Ada Lovelace"
                    className="w-full rounded-2xl border border-[var(--card-border)] bg-white px-4 py-3.5 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-[var(--foreground)]">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    className="w-full rounded-2xl border border-[var(--card-border)] bg-white px-4 py-3.5 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-[var(--foreground)]">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-[var(--card-border)] bg-white px-4 py-3.5 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-[var(--foreground)] px-5 py-4 text-base font-semibold text-white transition hover:bg-[var(--accent-strong)]"
                >
                  Create account
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-[var(--muted)]">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-[var(--accent-strong)] hover:underline">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </TiltWrapper>
      </section>
    </div>
  );
}
