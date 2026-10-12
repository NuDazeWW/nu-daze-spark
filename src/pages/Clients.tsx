import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Plus, Loader2, Users, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { Tables } from "@/integrations/supabase/types";

type Client = Tables<"clients">;
type ClientMember = Tables<"client_members">;

const PLATFORM_OPTIONS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
] as const;

function platformLabel(p: string) {
  return PLATFORM_OPTIONS.find((o) => o.value === p)?.label ?? p;
}

export default function Clients() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["linkedin", "instagram"]);
  const [memberDialogClient, setMemberDialogClient] = useState<Client | null>(null);
  const [memberEmail, setMemberEmail] = useState("");

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("name");
      if (error) throw error;
      return data as Client[];
    },
    enabled: isAdmin,
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ["client_members", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_members").select("*");
      if (error) throw error;
      return data as ClientMember[];
    },
    enabled: isAdmin,
  });

  const createClient = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clients").insert({ name, slug: slug.toLowerCase().trim(), platforms } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Client created" });
      setDialogOpen(false);
      setName(""); setSlug("");
      setPlatforms(["linkedin", "instagram"]);
    },
    onError: (e: Error) => toast({ title: "Failed to create client", description: e.message, variant: "destructive" }),
  });

  const addMember = useMutation({
    mutationFn: async () => {
      if (!memberDialogClient) return;
      // Look up user by email in profiles
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("display_name", memberEmail.trim())
        .maybeSingle();
      if (pErr) throw pErr;
      if (!profile) throw new Error("No user found with that email. They must sign in at least once first.");
      const { error } = await supabase.from("client_members").insert({
        client_id: memberDialogClient.id,
        user_id: profile.user_id,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client_members"] });
      toast({ title: "Member added" });
      setMemberEmail("");
    },
    onError: (e: Error) => toast({ title: "Failed to add member", description: e.message, variant: "destructive" }),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client_members"] });
      toast({ title: "Member removed" });
    },
    onError: (e: Error) => toast({ title: "Failed to remove member", description: e.message, variant: "destructive" }),
  });

  if (!isAdmin) return <div className="p-8 text-muted-foreground">Admin access required.</div>;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Clients"
        description="Manage the brands and workspaces SocialMotive serves. Each client scopes its own assets, sources, strategy, generation, queue, and approvals."
      >
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Client</Button>
      </PageHeader>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => {
            const memberCount = memberships.filter((m) => m.client_id === c.id).length;
            return (
              <Card key={c.id}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-semibold text-sm">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{c.slug}</p>
                      </div>
                    </div>
                    {!c.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {memberCount} explicit member{memberCount === 1 ? "" : "s"} · admins always have access
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setMemberDialogClient(c)}>
                      <Users className="mr-1 h-3 w-3" />Manage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Client</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="acme" />
              <p className="text-[10px] text-muted-foreground mt-1">URL-safe short identifier</p>
            </div>
            <Button onClick={() => createClient.mutate()} disabled={!name.trim() || !slug.trim() || createClient.isPending} className="w-full">
              {createClient.isPending ? "Creating…" : "Create Client"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!memberDialogClient} onOpenChange={(o) => !o && setMemberDialogClient(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Members · {memberDialogClient?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Admins always see every client. Add explicit members here to grant non-admin users access to this client.
            </p>
            <div className="flex gap-2">
              <Input
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="user@example.com"
              />
              <Button onClick={() => addMember.mutate()} disabled={!memberEmail.trim() || addMember.isPending}>
                Add
              </Button>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-auto">
              {memberships
                .filter((m) => m.client_id === memberDialogClient?.id)
                .map((m) => (
                  <div key={m.id} className="flex items-center justify-between border border-border rounded px-2.5 py-1.5">
                    <span className="text-xs font-mono truncate">{m.user_id}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeMember.mutate(m.id)}>
                      <X className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              {memberships.filter((m) => m.client_id === memberDialogClient?.id).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">No explicit members yet.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
