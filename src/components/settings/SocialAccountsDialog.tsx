import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

const PL: Record<string, string> = { linkedin: "LinkedIn", instagram: "Instagram", facebook: "Facebook" };

export function useSocialAccounts() {
  return useQuery({
    queryKey: ["social_accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("social_accounts").select("*").order("platform");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function SocialAccountsDialog({ client, onClose }: { client: { id: string; name: string } | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data = [] } = useSocialAccounts();
  const rows = data.filter((a) => a.client_id === client?.id);
  const [platform, setPlatform] = useState("linkedin");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [url, setUrl] = useState("");

  const sync = async (clientId: string) => {
    const { data: all } = await supabase.from("social_accounts").select("platform").eq("client_id", clientId).eq("is_active", true);
    const platforms = Array.from(new Set((all ?? []).map((a) => a.platform)));
    if (platforms.length) await supabase.from("clients").update({ platforms } as never).eq("id", clientId);
    qc.invalidateQueries({ queryKey: ["social_accounts"] });
    qc.invalidateQueries({ queryKey: ["clients"] });
  };

  const add = useMutation({
    mutationFn: async () => {
      if (!client || !name.trim()) throw new Error("Enter an account name");
      const { error } = await supabase.from("social_accounts").insert({ client_id: client.id, platform, account_name: name.trim(), handle: handle.trim() || null, profile_url: normalizeUrl(url) } as never);
      if (error) throw error;
      await sync(client.id);
    },
    onSuccess: () => { setName(""); setHandle(""); setUrl(""); toast.success("Account added"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (rows.length <= 1) throw new Error("Keep at least one social account");
      const { error } = await supabase.from("social_accounts").delete().eq("id", id);
      if (error) throw error;
      await sync(client!.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={Boolean(client)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Social accounts — {client?.name}</DialogTitle></DialogHeader>
        <ul className="divide-y divide-border">
          {rows.map((a) => (
            <li key={a.id} className="flex items-center gap-2 py-2 text-sm">
              <Badge variant="outline">{PL[a.platform]}</Badge>
              <span className="font-medium">{a.account_name}</span>
              {a.handle && <span className="text-muted-foreground font-mono text-xs">{a.handle}</span>}
              <ProfileLinkEditor id={a.id} value={a.profile_url} onSaved={() => qc.invalidateQueries({ queryKey: ["social_accounts"] })} />
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => remove.mutate(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </li>
          ))}
          {rows.length === 0 && <li className="py-2 text-sm text-muted-foreground">No accounts yet.</li>}
        </ul>
        <div className="grid gap-2 sm:grid-cols-2 pt-2 border-t border-border">
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(PL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Account / page name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="@handle (optional)" value={handle} onChange={(e) => setHandle(e.target.value)} />
          <Input placeholder="https://profile link (optional)" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <Button onClick={() => add.mutate()} disabled={add.isPending}><Plus className="mr-2 h-4 w-4" />Add account</Button>
      </DialogContent>
    </Dialog>
  );
}

export function normalizeUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v.replace(/^http:/i, "https:") : `https://${v.replace(/^\/+/, "")}`;
  try { return new URL(withScheme).toString(); } catch { throw new Error("That doesn't look like a web address"); }
}

function ProfileLinkEditor({ id, value, onSaved }: { id: string; value: string | null; onSaved: () => void }) {
  const [v, setV] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const dirty = v.trim() !== (value ?? "");
  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("social_accounts").update({ profile_url: normalizeUrl(v) } as never).eq("id", id);
      if (error) throw error;
      toast.success("Profile link saved"); onSaved();
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };
  return (
    <div className="flex flex-1 items-center gap-1 min-w-0">
      <Input className="h-7 text-xs" placeholder="Profile link, e.g. linkedin.com/company/…" value={v} onChange={(e) => setV(e.target.value)} />
      {dirty && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={save} disabled={saving}>Save</Button>}
      {!dirty && value && <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs underline shrink-0">open</a>}
    </div>
  );
}
