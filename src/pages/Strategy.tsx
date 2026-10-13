import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText, LayoutTemplate } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { BrandVoiceTab } from "@/components/strategy/BrandVoiceTab";
import { PlatformRulesTab } from "@/components/strategy/PlatformRulesTab";
import { AudiencesTab } from "@/components/strategy/AudiencesTab";
import { CampaignsTab } from "@/components/strategy/CampaignsTab";
import { HashtagBanksTab } from "@/components/strategy/HashtagBanksTab";
import { CtaBanksTab } from "@/components/strategy/CtaBanksTab";
import { CadenceTargetsTab } from "@/components/strategy/CadenceTargetsTab";
import { EngagementTargetsTab } from "@/components/strategy/EngagementTargetsTab";
import { GuardrailsTab } from "@/components/strategy/GuardrailsTab";
import { VoicesTab } from "@/components/strategy/VoicesTab";
import { StrategyBuilderDialog, type BuilderMode } from "@/components/strategy/StrategyBuilderDialog";

export default function Strategy() {
  const { isAdmin } = useAuth();
  const [params] = useSearchParams();
  const initial = params.get("builder") as BuilderMode | null;
  const [builder, setBuilder] = useState<BuilderMode | null>(initial && ["website", "document", "preset"].includes(initial) ? initial : null);
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Strategy & Rules"
        description="Brand voice, guardrails, platform rules, audiences, campaigns, hashtags, CTAs, and targets."
      >
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setBuilder("preset")}><LayoutTemplate className="mr-1.5 h-4 w-4" />Starter kits</Button>
            <Button variant="outline" size="sm" onClick={() => setBuilder("document")}><FileText className="mr-1.5 h-4 w-4" />Import brand guide</Button>
            <Button size="sm" onClick={() => setBuilder("website")}><Sparkles className="mr-1.5 h-4 w-4" />Generate brand voice</Button>
          </div>
        )}
      </PageHeader>
      <Tabs defaultValue={params.get("tab") ?? "voice"} key={params.get("tab") ?? "voice"} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-secondary/50 p-1">
          <TabsTrigger value="voice" className="text-xs">Brand Voice</TabsTrigger>
          <TabsTrigger value="voices" className="text-xs">Voices</TabsTrigger>
          <TabsTrigger value="guardrails" className="text-xs">Guardrails</TabsTrigger>
          <TabsTrigger value="platform" className="text-xs">Platform Rules</TabsTrigger>
          <TabsTrigger value="audiences" className="text-xs">Audiences</TabsTrigger>
          <TabsTrigger value="campaigns" className="text-xs">Campaigns</TabsTrigger>
          <TabsTrigger value="hashtags" className="text-xs">Hashtags</TabsTrigger>
          <TabsTrigger value="ctas" className="text-xs">CTAs</TabsTrigger>
          <TabsTrigger value="cadence" className="text-xs">Cadence</TabsTrigger>
          <TabsTrigger value="engagement" className="text-xs">Engagement</TabsTrigger>
        </TabsList>
        <TabsContent value="voice"><BrandVoiceTab /></TabsContent>
        <TabsContent value="voices"><VoicesTab /></TabsContent>
        <TabsContent value="guardrails"><GuardrailsTab /></TabsContent>
        <TabsContent value="platform"><PlatformRulesTab /></TabsContent>
        <TabsContent value="audiences"><AudiencesTab /></TabsContent>
        <TabsContent value="campaigns"><CampaignsTab /></TabsContent>
        <TabsContent value="hashtags"><HashtagBanksTab /></TabsContent>
        <TabsContent value="ctas"><CtaBanksTab /></TabsContent>
        <TabsContent value="cadence"><CadenceTargetsTab /></TabsContent>
        <TabsContent value="engagement"><EngagementTargetsTab /></TabsContent>
      </Tabs>
      {builder && <StrategyBuilderDialog mode={builder} open onOpenChange={(o) => !o && setBuilder(null)} />}
    </div>
  );
}
