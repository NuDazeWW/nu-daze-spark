import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClientSocialAccounts, type SocialAccount } from "@/hooks/useClientSocialAccounts";
import { Button } from "@/components/ui/button";
import { AccountPhotoEditor } from "./AccountPhotoEditor";

/** Picks the saved social account for this platform so previews show the real account name and photo. */
export function usePreviewAccount(clientId: string | null | undefined, platform: string) {
  const { data: accounts = [] } = useClientSocialAccounts(clientId);
  const account = accounts.find((a) => a.platform === platform) ?? null;
  const { data: avatarUrl } = useQuery({
    queryKey: ["account_avatar", account?.avatar_path],
    enabled: !!account?.avatar_path,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      if (!account?.avatar_path) return null;
      const { data, error } = await supabase.storage.from("account-avatars").createSignedUrl(account.avatar_path, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  return { account, avatarUrl: avatarUrl ?? null };
}

export function PreviewAvatar({ name, url, small }: { name: string; url: string | null; small?: boolean }) {
  const initials = name.split(/\s+/).map((s) => s[0]).slice(0, 2).join("");
  return url
    ? <img src={url} alt="" className="native-avatar object-cover" style={small ? undefined : undefined} />
    : <span className="native-avatar" aria-hidden="true">{initials}</span>;
}

/** Admin-only control shown under the preview to add or replace the account photo. */
export function AccountPhotoControl({ account, clientId, hasPhoto }: { account: SocialAccount | null; clientId: string; hasPhoto: boolean }) {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  if (!account) return <p className="text-xs text-muted-foreground">No saved account for this platform — add one in Settings › Your Brand Profiles › Accounts to show its real name and photo.</p>;
  if (!isAdmin) return hasPhoto ? null : <p className="text-xs text-muted-foreground">No account photo saved — ask an admin to add one.</p>;

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${clientId}/${account.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("account-avatars").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error } = await supabase.from("social_accounts").update({ avatar_path: path }).eq("id", account.id);
      if (error) throw error;
      if (account.avatar_path) await supabase.storage.from("account-avatars").remove([account.avatar_path]);
      await qc.invalidateQueries({ queryKey: ["social_accounts", clientId] });
      setSelectedFile(null);
      toast.success("Account photo saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add the photo");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return <div className="flex items-center gap-2 flex-wrap">
    <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return toast.error("Please choose a PNG, JPEG or WebP image");
      if (file.size > 20 * 1024 * 1024) return toast.error("Image must be under 20 MB");
      setSelectedFile(file);
    }} />
    <Button variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()} className="text-xs">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
      {hasPhoto ? "Change account photo" : "Add account photo"}
    </Button>
    {!hasPhoto && <span className="text-xs text-muted-foreground">Shows as {account.account_name}'s profile picture</span>}
    <AccountPhotoEditor file={selectedFile} busy={busy} onCancel={() => setSelectedFile(null)} onSave={upload} />
  </div>;
}
