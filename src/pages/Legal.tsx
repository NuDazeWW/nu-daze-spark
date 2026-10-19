import { Link, useLocation } from "react-router-dom";
import agreement from "@/content/legal/user-agreement.md?raw";
import privacy from "@/content/legal/privacy.md?raw";
import aup from "@/content/legal/acceptable-use.md?raw";
import cookies from "@/content/legal/cookies.md?raw";
import subprocessors from "@/content/legal/subprocessors.md?raw";
import dmca from "@/content/legal/dmca.md?raw";
import security from "@/content/legal/security.md?raw";
import accessibility from "@/content/legal/accessibility.md?raw";
import logo from "@/assets/socialmotive-logo.jpg";
import { BackLink } from "@/components/shared/BackLink";

/** Bump a document's version on any material change; users re-accept at next sign-in. */
export const LEGAL_VERSIONS = { terms: "2026-10-19", privacy: "2026-10-19", acceptable_use: "2026-10-19", cookies: "2026-10-19" } as const;
export const LEGAL_VERSION = Object.values(LEGAL_VERSIONS).join("|");

export function LegalText({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-foreground">
      {text.split(/\n\s*\n/).map((block, i) => {
        const lines = block.trim().split("\n");
        const isHeading = /^(\d+\.\s+)?[A-Z ,&()—-]+$/.test(lines[0]) && lines[0].length > 3;
        return (
          <div key={i}>
            {isHeading && <h2 className="mt-4 font-semibold text-foreground">{lines[0]}</h2>}
            {(isHeading ? lines.slice(1) : lines).map((l, j) => (
              <p key={j} className="mt-1 text-muted-foreground">{l}</p>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export const LEGAL_DOCS = {
  terms: { path: "/terms", title: "Terms of Service", text: agreement, version: LEGAL_VERSIONS.terms },
  privacy: { path: "/privacy", title: "Privacy Policy", text: privacy, version: LEGAL_VERSIONS.privacy },
  acceptable_use: { path: "/acceptable-use", title: "Acceptable Use Policy", text: aup, version: LEGAL_VERSIONS.acceptable_use },
  cookies: { path: "/cookies", title: "Cookie Notice", text: cookies, version: LEGAL_VERSIONS.cookies },
} as const;
export type LegalDocKey = keyof typeof LEGAL_DOCS;

const INFO_PAGES = {
  "/subprocessors": { title: "Outside services (subprocessors)", text: subprocessors },
  "/dmca": { title: "DMCA notice", text: dmca },
  "/security": { title: "Security contact", text: security },
  "/accessibility": { title: "Accessibility statement", text: accessibility },
} as const;

export function LegalFooter() {
  return (
    <footer className="mt-10 border-t pt-4 text-xs text-muted-foreground">
      <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-1">
        {Object.values(LEGAL_DOCS).map((d) => <Link key={d.path} to={d.path} className="hover:underline">{d.title} (v{d.version})</Link>)}
        {Object.entries(INFO_PAGES).map(([p, d]) => <Link key={p} to={p} className="hover:underline">{d.title}</Link>)}
      </nav>
      <p className="mt-1">Draft — pending legal review.</p>
    </footer>
  );
}

export default function Legal() {
  const { pathname } = useLocation();
  const legal = Object.values(LEGAL_DOCS).find((d) => d.path === pathname);
  const info = INFO_PAGES[pathname as keyof typeof INFO_PAGES];
  const doc = legal ?? info ?? LEGAL_DOCS.terms;
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link to="/" aria-label="SocialMotive home"><img src={logo} alt="SocialMotive" className="mb-6 h-10 w-auto rounded-md" /></Link>
        <BackLink fallback="/auth" fallbackLabel="sign in" />
        <h1 className="mb-1 mt-4 text-2xl font-semibold text-foreground">{doc.title}</h1>
        {legal && <p className="mb-6 font-mono text-xs text-muted-foreground">Version {legal.version} · Effective {legal.version} · Draft — pending legal review</p>}
        <LegalText text={doc.text} />
        <LegalFooter />
      </div>
    </div>
  );
}
