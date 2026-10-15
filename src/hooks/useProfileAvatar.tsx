import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bird, Briefcase, Compass, Feather, Flame, Leaf, Rocket, Sparkles, Star, Sun, Zap, Heart, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Identity icons a user can pick instead of a photo; stored as "icon:<key>" on profiles.avatar_url. */
export const IDENTITY_ICONS: Record<string, LucideIcon> = {
  bird: Bird, sparkles: Sparkles, rocket: Rocket, star: Star, zap: Zap, compass: Compass,
  feather: Feather, leaf: Leaf, sun: Sun, flame: Flame, heart: Heart, briefcase: Briefcase,
};

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function probe(url: string) {
  return new Promise<boolean>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

export type ResolvedAvatar =
  | { kind: "icon"; icon: LucideIcon; key: string }
  | { kind: "image"; url: string; source: "upload" | "public" }
  | { kind: "initials" };

/** Resolves the signed-in user's avatar: chosen icon/upload, then sign-in provider photo, then public email image, then initials. */
export function useProfileAvatar() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const profileQ = useQuery({
    queryKey: ["my_profile_avatar", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("avatar_url").eq("user_id", user!.id).maybeSingle();
      return (data?.avatar_url as string | null) ?? null;
    },
  });
  const stored = profileQ.data ?? null;

  const uploadUrlQ = useQuery({
    queryKey: ["my_avatar_signed", stored],
    enabled: !!stored?.startsWith("upload:"),
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("user-avatars").createSignedUrl(stored!.slice(7), 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });

  const [publicUrl, setPublicUrl] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let ignore = false;
    setPublicUrl(undefined);
    if (!user?.email) { setPublicUrl(null); return; }
    const meta = user.user_metadata ?? {};
    const provider = (meta.avatar_url || meta.picture) as string | undefined;
    (async () => {
      if (provider && (await probe(provider))) { if (!ignore) setPublicUrl(provider); return; }
      const hash = await sha256Hex(user.email!.trim().toLowerCase());
      const g = `https://gravatar.com/avatar/${hash}?s=128&d=404`;
      const ok = await probe(g);
      if (!ignore) setPublicUrl(ok ? g : null);
    })();
    return () => { ignore = true; };
  }, [user?.id, user?.email]);

  let avatar: ResolvedAvatar = { kind: "initials" };
  if (stored?.startsWith("icon:") && IDENTITY_ICONS[stored.slice(5)]) avatar = { kind: "icon", key: stored.slice(5), icon: IDENTITY_ICONS[stored.slice(5)] };
  else if (stored?.startsWith("upload:") && uploadUrlQ.data) avatar = { kind: "image", url: uploadUrlQ.data, source: "upload" };
  else if (publicUrl) avatar = { kind: "image", url: publicUrl, source: "public" };

  const initials = user?.email ? user.email.substring(0, 2).toUpperCase() : "U";
  const resolved = !profileQ.isLoading && publicUrl !== undefined && (!stored?.startsWith("upload:") || !uploadUrlQ.isLoading);

  const save = async (value: string | null) => {
    if (!user) return;
    const previous = stored;
    const { error } = await supabase.from("profiles").update({ avatar_url: value }).eq("user_id", user.id);
    if (error) throw error;
    if (previous?.startsWith("upload:") && previous !== value) await supabase.storage.from("user-avatars").remove([previous.slice(7)]);
    await qc.invalidateQueries({ queryKey: ["my_profile_avatar", user.id] });
  };

  const upload = async (file: File) => {
    if (!user) return;
    const path = `${user.id}/avatar-${Date.now()}.png`;
    const { error } = await supabase.storage.from("user-avatars").upload(path, file, { contentType: file.type });
    if (error) throw error;
    await save(`upload:${path}`);
  };

  return { avatar, initials, stored, resolved, save, upload };
}
