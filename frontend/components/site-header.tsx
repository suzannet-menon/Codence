"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CodenceMark } from "@/components/codence-mark";
import { TextRoll } from "@/components/v1/skiper58";

const navItems = [
  { href: "/", label: "Landing" },
  { href: "/interview/demo-pr", label: "Interview" },
  { href: "/chat", label: "Chat" }
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="relative z-10 border-b border-[var(--card-border)]">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 items-center gap-4 px-6 py-5 sm:grid-cols-[1fr_auto_1fr] lg:px-10">
        <Link href="/" className="flex items-center gap-2.5 justify-self-start">
          <CodenceMark size={32} className="shrink-0" />
          <p className="text-lg font-semibold whitespace-nowrap text-[var(--foreground)]">
            Codence
          </p>
        </Link>

        <nav className="order-3 col-span-2 justify-self-center sm:order-none sm:col-auto">
          <ul className="flex items-center gap-1 rounded-full border border-[var(--card-border)] bg-white/80 p-1.5 text-sm shadow-[0_2px_10px_rgba(22,21,15,0.05)]">
            {navItems.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href.split("/").slice(0, 2).join("/"));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`block rounded-full px-4 py-2 font-medium transition ${
                      isActive
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
                    }`}
                  >
                    <TextRoll>{item.label}</TextRoll>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center justify-end gap-2 justify-self-end sm:gap-3">
          <Link
            href="/login"
            className="whitespace-nowrap text-xs font-medium text-[var(--muted)] transition hover:text-[var(--foreground)] sm:text-sm"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="whitespace-nowrap rounded-full bg-[var(--foreground)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--accent-strong)] sm:px-4 sm:py-2 sm:text-sm"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
