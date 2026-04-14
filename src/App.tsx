import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AssetLibrary from "./pages/AssetLibrary";
import ConnectedSources from "./pages/ConnectedSources";
import Strategy from "./pages/Strategy";
import PostGenerator from "./pages/PostGenerator";
import DailyQueue from "./pages/DailyQueue";
import CommentGenerator from "./pages/CommentGenerator";
import ApprovedContent from "./pages/ApprovedContent";
import RepurposeCenter from "./pages/RepurposeCenter";
import AccountTags from "./pages/AccountTags";
import NotFound from "./pages/NotFound";

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
              <Route path="/generator" element={<PostGenerator />} />
              <Route path="/queue" element={<DailyQueue />} />
              <Route path="/comments" element={<CommentGenerator />} />
              <Route path="/approved" element={<ApprovedContent />} />
              <Route path="/repurpose" element={<RepurposeCenter />} />
              <Route path="/settings/tags" element={<AccountTags />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
