import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import AssetLibrary from "./pages/AssetLibrary";
import ConnectedSources from "./pages/ConnectedSources";
import Strategy from "./pages/Strategy";
import PostGenerator from "./pages/PostGenerator";
import CampaignBriefs from "./pages/CampaignBriefs";
import DailyQueue from "./pages/DailyQueue";
import ContentPlanner from "./pages/ContentPlanner";
import CommentGenerator from "./pages/CommentGenerator";
import ApprovedContent from "./pages/ApprovedContent";
import RepurposeCenter from "./pages/RepurposeCenter";
import AccountTags from "./pages/AccountTags";
import Clients from "./pages/Clients";
import NotFound from "./pages/NotFound";
import WorkspaceSettings from "./pages/settings/WorkspaceSettings";
import Team from "./pages/settings/Team";
import Usage from "./pages/settings/Usage";
import Notifications from "./pages/settings/Notifications";
import EmailProvider from "./pages/settings/EmailProvider";
import Connections from "./pages/settings/Connections";
import BrandKitPage from "./pages/settings/BrandKit";
import MediaStudioPage from "./pages/MediaStudioPage";
import Setup from "./pages/Setup";
import WhatsNew from "./pages/WhatsNew";
import Help from "./pages/Help";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/assets" element={<AssetLibrary />} />
              <Route path="/sources" element={<ConnectedSources />} />
              <Route path="/strategy" element={<Strategy />} />
              <Route path="/briefs" element={<CampaignBriefs />} />
              <Route path="/generator" element={<PostGenerator />} />
              <Route path="/queue" element={<DailyQueue />} />
              <Route path="/planner" element={<ContentPlanner />} />
              <Route path="/comments" element={<CommentGenerator />} />
              <Route path="/approved" element={<ApprovedContent />} />
              <Route path="/repurpose" element={<RepurposeCenter />} />
              <Route path="/settings/tags" element={<AccountTags />} />
              <Route path="/settings/clients" element={<Clients />} />
              <Route path="/settings/workspace" element={<WorkspaceSettings />} />
              <Route path="/settings/team" element={<Team />} />
              <Route path="/settings/usage" element={<Usage />} />
              <Route path="/settings/notifications" element={<Notifications />} />
              <Route path="/settings/connections" element={<Connections />} />
              <Route path="/settings/brand-kit" element={<BrandKitPage />} />
              <Route path="/media-studio" element={<MediaStudioPage />} />
              <Route path="/settings/email-provider" element={<EmailProvider />} />
              <Route path="/setup" element={<Setup />} />
              <Route path="/whats-new" element={<WhatsNew />} />
              <Route path="/help" element={<Help />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
