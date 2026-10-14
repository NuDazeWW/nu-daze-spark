import type { ReactNode } from "react";
import { BarChart3, Users, Zap } from "lucide-react";
import bird from "@/assets/brand/socialmotive-header-bird.png";

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <div className="sm-auth-wordmark">
        Social<strong>Motive</strong>
      </div>
      <div className="sm-auth-tagline">AI-powered social intelligence</div>
    </div>
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="sm-auth">
      <section className="sm-auth-art" aria-hidden="false">
        <Wordmark className="sm-auth-art-brand" />
        <img src={bird} alt="" aria-hidden className="sm-auth-bird" />
        <div className="sm-auth-copy">
          <h2 className="sm-auth-headline">
            Signals
            <br />
            become
            <br />
            <span>direction.</span>
          </h2>
          <p>Your AI-powered workspace for smarter, faster, more impactful social content.</p>
          <ul className="sm-auth-benefits">
            <li><Zap className="text-[hsl(var(--sm-auth-cyan))]" /><span><b>Create</b>with purpose</span></li>
            <li><BarChart3 className="text-[hsl(var(--sm-auth-coral))]" /><span><b>Amplify</b>with intelligence</span></li>
            <li><Users className="text-[hsl(var(--sm-auth-gold))]" /><span><b>Drive</b>real impact</span></li>
          </ul>
        </div>
      </section>
      <section className="sm-auth-panel">
        <div className="sm-auth-card">
          <div className="sm-auth-card-logo">
            <img src={bird} alt="" aria-hidden />
            <Wordmark />
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
