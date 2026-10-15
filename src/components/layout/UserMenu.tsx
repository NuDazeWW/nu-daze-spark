import { useEffect, useState } from "react";
import { BarChart3, CreditCard, ImageIcon, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useProfileAvatar } from "@/hooks/useProfileAvatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { IdentityDialog } from "./IdentityDialog";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const ws = useWorkspace();
  const navigate = useNavigate();
  const { avatar, initials, stored, resolved } = useProfileAvatar();
  const [identityOpen, setIdentityOpen] = useState(false);

  // After sign-in, offer the picker once when no picture is available.
  useEffect(() => {
    if (!user || !resolved) return;
    const key = `sm-identity-prompted:${user.id}`;
    if (avatar.kind === "initials" && !stored && !localStorage.getItem(key)) {
      localStorage.setItem(key, "1");
      setIdentityOpen(true);
    }
  }, [user, resolved, avatar.kind, stored]);

  async function handleLogout() {
    await signOut();
    navigate("/auth", { replace: true });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
            <Avatar className="h-8 w-8">
              {avatar.kind === "image" && <AvatarImage src={avatar.url} alt="" className="object-cover" />}
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                {avatar.kind === "icon" ? <avatar.icon className="size-4" /> : initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium leading-none">Account</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setIdentityOpen(true)}>
            <ImageIcon className="mr-2 h-4 w-4" />
            Change profile picture
          </DropdownMenuItem>
          {ws.canManage && (
            <>
              <DropdownMenuItem asChild>
                <Link to="/settings/usage"><BarChart3 className="mr-2 h-4 w-4" />Usage & Activity</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings/billing"><CreditCard className="mr-2 h-4 w-4" />Plan & Billing</Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <IdentityDialog open={identityOpen} onOpenChange={setIdentityOpen} />
    </>
  );
}
