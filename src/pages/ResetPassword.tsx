import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import socialMotiveLogo from "@/assets/socialmotive-logo.jpg";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const hashType = new URLSearchParams(window.location.hash.slice(1)).get("type");
    if (hashType === "recovery") setRecoveryReady(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryReady(true);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session && hashType === "recovery") setRecoveryReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: "Could not update password", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Password updated", description: "You are now signed in." });
    navigate("/", { replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-8">
        <img src={socialMotiveLogo} alt="SocialMotive" className="mx-auto w-full max-w-[280px] rounded-md" />
        <section className="space-y-6 rounded-lg border border-border bg-card p-6 shadow-card">
          <div className="text-center">
            <h1 className="text-lg font-semibold text-card-foreground">Set your password</h1>
            <p className="mt-1 text-sm text-muted-foreground">Choose a password for your SocialMotive account.</p>
          </div>

          {!recoveryReady ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">This recovery link is invalid or has expired.</p>
              <Button variant="outline" className="w-full" onClick={() => navigate("/auth")}>Return to sign in</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Saving..." : "Save password"}</Button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}