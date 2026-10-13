import { PlatformIcon } from "./PlatformIcon";
import { CollapsibleNavGroup } from "./CollapsibleNavGroup";
import { Link } from "react-router-dom";
import {
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useActiveClient } from "@/contexts/ClientContext";
import { useClientSocialAccounts, PLATFORM_LABEL } from "@/hooks/useClientSocialAccounts";
import { useAuth } from "@/hooks/useAuth";

const ADD_LINK_PILL =
  "ml-auto shrink-0 rounded border border-sidebar-border bg-sidebar-accent/40 px-1.5 py-0.5 " +
  "text-[10px] font-semibold uppercase tracking-wide text-sidebar-foreground/80 " +
  "transition-colors group-data-[collapsible=icon]:hidden";

export function SidebarPostTo() {
  const { activeClientId } = useActiveClient();
  const { isAdmin } = useAuth();
  const { data: accounts = [] } = useClientSocialAccounts(activeClientId);
  if (!activeClientId) return null;

  return (
    <CollapsibleNavGroup id="postto" label="Post to">
      <SidebarMenu>
        {accounts.length === 0 && (
          <SidebarMenuItem>
            <span className="px-2 text-xs text-sidebar-foreground/60">No social accounts saved</span>
          </SidebarMenuItem>
        )}
        {accounts.map((a) => {
          const platform = PLATFORM_LABEL[a.platform] ?? a.platform;
          const tip = a.handle ? `${platform} · ${a.handle}` : platform;
          return (
            <SidebarMenuItem key={a.id}>
              {a.profile_url ? (
                <SidebarMenuButton asChild tooltip={`${tip} — open`}>
                  <a href={a.profile_url} target="_blank" rel="noopener noreferrer">
                    <PlatformIcon platform={a.platform} className="size-4" />
                    <span className="truncate">{platform}</span>
                  </a>
                </SidebarMenuButton>
              ) : isAdmin ? (
                <SidebarMenuButton asChild tooltip={`${tip} — add a profile link`}>
                  <Link to={`/settings/clients?accounts=${activeClientId}`}>
                    <PlatformIcon platform={a.platform} className="size-4" />
                    <span className="truncate">{platform}</span>
                    <span className={ADD_LINK_PILL}>Add link</span>
                  </Link>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  disabled
                  tooltip={`${tip} — an admin can add a profile link`}
                >
                  <PlatformIcon platform={a.platform} className="size-4" />
                  <span className="truncate">{platform}</span>
                  <span className={`${ADD_LINK_PILL} opacity-60`}>Add link</span>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
      <p className="px-2 pt-1 text-[10px] text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden">Profile links are set in Settings › Your Brand Profiles › Accounts.</p>
    </CollapsibleNavGroup>
  );
}
