import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformIcon } from "./PlatformIcon";
import { useActiveClient } from "@/contexts/ClientContext";
import { useClientSocialAccounts, PLATFORM_LABEL } from "@/hooks/useClientSocialAccounts";
import { useAuth } from "@/hooks/useAuth";

/** Post to: same links and permissions as before, shown on Post Office. Opens profiles only — no publishing here. */
export function PostToCard() {
  const { activeClientId } = useActiveClient();
  const { isAdmin } = useAuth();
  const { data: accounts = [] } = useClientSocialAccounts(activeClientId);
  return (
    <Card id="post-connector" className="sm-lit scroll-mt-24" data-accent="violet">
      <CardHeader className="pb-2"><CardTitle className="text-base">Post to</CardTitle></CardHeader>
      <CardContent className="space-y-1.5">
        {!activeClientId && <p className="text-xs text-muted-foreground">Choose an organization first.</p>}
        {activeClientId && accounts.length === 0 && <p className="text-xs text-muted-foreground">No social accounts saved</p>}
        {accounts.map((a) => {
          const platform = PLATFORM_LABEL[a.platform] ?? a.platform;
          const row = "flex min-w-0 items-center gap-2 rounded-md border border-border px-2.5 py-2 text-sm transition-colors";
          const inner = <><PlatformIcon platform={a.platform} className="size-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{platform}</span></>;
          if (a.profile_url) return (
            <a key={a.id} href={a.profile_url} target="_blank" rel="noopener noreferrer" title={`${platform}${a.handle ? ` · ${a.handle}` : ""} — open`} className={`${row} hover:bg-muted`}>
              {inner}<ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
            </a>
          );
          if (isAdmin) return (
            <Link key={a.id} to={`/settings/clients?accounts=${activeClientId}`} className={`${row} hover:bg-muted`}>
              {inner}<span className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase">Add link</span>
            </Link>
          );
          return <div key={a.id} className={`${row} opacity-60`} title="An admin can add a profile link">{inner}<span className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase">Add link</span></div>;
        })}
        <p className="pt-1 text-[11px] text-muted-foreground">Profile links are set in Settings › Your Brand Profiles › Accounts.</p>
      </CardContent>
    </Card>
  );
}
