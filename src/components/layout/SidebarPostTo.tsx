import { Linkedin, Instagram, Facebook, Globe, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import {
  SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useActiveClient } from "@/contexts/ClientContext";
import { useClientSocialAccounts, PLATFORM_LABEL } from "@/hooks/useClientSocialAccounts";
import { useAuth } from "@/hooks/useAuth";

const ICONS: Record<string, typeof Globe> = { linkedin: Linkedin, instagram: Instagram, facebook: Facebook };

export function SidebarPostTo() {
  const { activeClientId } = useActiveClient();
  const { isAdmin } = useAuth();
  const { data: accounts = [] } = useClientSocialAccounts(activeClientId);
  if (!activeClientId) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Post to</SidebarGroupLabel>
      <SidebarMenu>
        {accounts.length === 0 && (
          <SidebarMenuItem>
            <span className="px-2 text-xs text-sidebar-foreground/60">No social accounts saved</span>
          </SidebarMenuItem>
        )}
        {accounts.map((a) => {
          const Icon = ICONS[a.platform] ?? Globe;
          const label = a.handle ? `${PLATFORM_LABEL[a.platform] ?? a.platform} · ${a.handle}` : a.account_name;
          return (
            <SidebarMenuItem key={a.id}>
              {a.profile_url ? (
                <SidebarMenuButton asChild tooltip={label}>
                  <a href={a.profile_url} target="_blank" rel="noopener noreferrer">
                    <Icon className="size-4" />
                    <span className="truncate">{label}</span>
                  </a>
                </SidebarMenuButton>
              ) : isAdmin ? (
                <SidebarMenuButton asChild tooltip={`Add a profile link for ${label}`}>
                  <Link to="/clients">
                    <Plus className="size-4" />
                    <span className="truncate">{label} — add link</span>
                  </Link>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton disabled className="opacity-60">
                  <Icon className="size-4" />
                  <span className="truncate">{label} — no link</span>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
