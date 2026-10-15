import { Link, useLocation } from "react-router-dom";
import agreement from "@/content/legal/user-agreement.md?raw";
import privacy from "@/content/legal/privacy.md?raw";

export const LEGAL_VERSION = "2026-10-15";

export function LegalText({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-foreground">
      {text.split(/\n\s*\n/).map((block, i) => {
        const lines = block.trim().split("\n");
        const isHeading = /^\d+\.\s+[A-Z ,&-]+$/.test(lines[0]);
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
  terms: { title: "SocialMotive User Agreement", text: agreement },
  privacy: { title: "Privacy and Data Processing Terms", text: privacy },
};

export default function Legal() {
  const isPrivacy = useLocation().pathname.startsWith("/privacy");
  const doc = isPrivacy ? LEGAL_DOCS.privacy : LEGAL_DOCS.terms;
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-6 flex gap-4 text-sm">
          <Link to="/terms" className="text-primary hover:underline">User Agreement</Link>
          <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          <Link to="/auth" className="ml-auto text-muted-foreground hover:underline">Back to sign in</Link>
        </div>
        <h1 className="mb-6 text-2xl font-semibold text-foreground">{doc.title}</h1>
        <LegalText text={doc.text} />
      </div>
    </div>
  );
}
