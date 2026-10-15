import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LEGAL_DOCS, LEGAL_VERSION, LegalText } from "./Legal";

const CONSENTS = [
  "I have read and agree to the SocialMotive User Agreement, including the Acceptable Use Policy, the Metering, Credits and Allowances terms, and the Privacy and Data Processing terms.",
  "I confirm I am at least 18 years old and that I have authority to bind the organization I represent to this agreement.",
  "I understand that AI media credits, X dispatch allowance, AI text drafts, direct posts and storage are metered; that my balance is checked before each action; and that exceeding a cap blocks that feature until I buy a top-up, upgrade my plan, or connect my own provider key.",
  "I understand that credit packs and top-ups are non-refundable and do not roll over from month to month.",
  "I understand that publishing to connected social platforms depends on third-party APIs and their rate limits, and that X charges a fee per post which may be passed through to me or capped by my plan.",
  "I understand that automated actions are checked before they run and that the platform will not spend on my behalf beyond my plan limits.",
];

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const REMEMBER_KEY = "socialmotive_remembered_email";
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) ?? "");
  const [remember, setRemember] = useState(() => !!localStorage.getItem(REMEMBER_KEY));
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [checks, setChecks] = useState<boolean[]>(() => CONSENTS.map(() => false));
  const [doc, setDoc] = useState<null | "terms" | "privacy">(null);
  const allChecked = checks.every(Boolean);
  const navigate = useNavigate();
  const { toast } = useToast();

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: { prompt: "select_account" },
      });

      if (result.error) throw result.error;
      if (result.redirected) return;

      navigate("/", { replace: true });
    } catch (error: any) {
      toast({
        title: "Google sign-in failed",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  }


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (remember) localStorage.setItem(REMEMBER_KEY, email);
        else localStorage.removeItem(REMEMBER_KEY);
        navigate("/");
      } else {
        if (!allChecked) throw new Error("Please accept all terms to create an account.");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { terms_version: LEGAL_VERSION, terms_accepted_at: new Date().toISOString() } },
        });
        if (error) throw error;
        toast({
          title: "Account created",
          description: "Check your email to verify your account.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      toast({ title: "Enter your work email first", variant: "destructive" });
      return;
    }

    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);

    if (error) {
      toast({ title: "Could not send recovery email", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Check your email", description: "We sent a secure link to set your password." });
  }

  return (
    <AuthShell>
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-lg font-semibold text-card-foreground">
              {isLogin ? "Welcome back" : "Create account"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLogin
                ? "Sign in to your workspace"
                : "Set up your SocialMotive account"}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="sm-auth-google w-full"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading || (!isLogin && !allChecked)}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.62 0 3.06.56 4.21 1.65l3.15-3.15C17.45 1.47 14.96.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.14 6.16-4.14Z"
              />
            </svg>
            {googleLoading ? "Connecting..." : "Continue with Google"}
          </Button>

          <div className="sm-auth-divider relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-2 text-xs uppercase tracking-wider text-muted-foreground">
                or
              </span>
            </div>
          </div>


          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative"><Mail className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 h-4 w-4 text-[hsl(var(--sm-auth-muted))]" aria-hidden />
              <Input
                className="pl-10"
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative"><Lock className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 h-4 w-4 text-[hsl(var(--sm-auth-muted))]" aria-hidden />
              <Input
                className="pl-10"
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              </div>
            </div>
            {isLogin && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <Checkbox id="remember" checked={remember} onCheckedChange={(c) => setRemember(!!c)} />
                Remember me
              </label>
            )}
            {!isLogin && (
              <div className="space-y-3 rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">
                    Read the{" "}
                    <button type="button" className="sm-auth-link underline" onClick={() => setDoc("terms")}>User Agreement</button>{" "}and{" "}
                    <button type="button" className="sm-auth-link underline" onClick={() => setDoc("privacy")}>Privacy Policy</button>
                  </span>
                  <button type="button" className="sm-auth-link whitespace-nowrap underline" onClick={() => setChecks(CONSENTS.map(() => !allChecked))}>
                    {allChecked ? "Clear all" : "Check all"}
                  </button>
                </div>
                {CONSENTS.map((text, i) => (
                  <label key={i} className="flex items-start gap-2 text-xs leading-snug text-muted-foreground cursor-pointer">
                    <Checkbox className="mt-0.5" checked={checks[i]} onCheckedChange={(c) => setChecks((p) => p.map((v, j) => (j === i ? !!c : v)))} />
                    <span>{text}</span>
                  </label>
                ))}
              </div>
            )}
            <Button type="submit" className="sm-auth-primary w-full" disabled={loading || (!isLogin && !allChecked)}>
              {loading ? "Loading..." : isLogin ? "Sign in" : "Create account"}
              <ArrowRight className="absolute right-5 h-5 w-5" aria-hidden />
            </Button>
            {isLogin && (
              <Button
                type="button"
                variant="link"
                className="sm-auth-link w-full"
                onClick={handleForgotPassword}
                disabled={resetLoading}
              >
                {resetLoading ? "Sending..." : "Set or reset password"}
              </Button>
            )}
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="sm-auth-link text-sm hover:underline"
            >
              {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
        <Dialog open={!!doc} onOpenChange={(o) => !o && setDoc(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{doc ? LEGAL_DOCS[doc].title : ""}</DialogTitle></DialogHeader>
            <div className="max-h-[65vh] overflow-y-auto pr-2">{doc && <LegalText text={LEGAL_DOCS[doc].text} />}</div>
          </DialogContent>
        </Dialog>
    </AuthShell>
  );
}
