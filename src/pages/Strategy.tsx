import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandVoiceTab } from "@/components/strategy/BrandVoiceTab";
import { PlatformRulesTab } from "@/components/strategy/PlatformRulesTab";
import { AudiencesTab } from "@/components/strategy/AudiencesTab";
import { CampaignsTab } from "@/components/strategy/CampaignsTab";
import { HashtagBanksTab } from "@/components/strategy/HashtagBanksTab";
import { CtaBanksTab } from "@/components/strategy/CtaBanksTab";
import { CadenceTargetsTab } from "@/components/strategy/CadenceTargetsTab";
import { EngagementTargetsTab } from "@/components/strategy/EngagementTargetsTab";

export default function Strategy() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Strategy & Rules"
        description="Brand voice, platform rules, audiences, campaigns, hashtags, CTAs, and targets."
      />
      <Tabs defaultValue="voice" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-secondary/50 p-1">
          <TabsTrigger value="voice" className="text-xs">Brand Voice</TabsTrigger>
          <TabsTrigger value="platform" className="text-xs">Platform Rules</TabsTrigger>
          <TabsTrigger value="audiences" className="text-xs">Audiences</TabsTrigger>
          <TabsTrigger value="campaigns" className="text-xs">Campaigns</TabsTrigger>
          <TabsTrigger value="hashtags" className="text-xs">Hashtags</TabsTrigger>
          <TabsTrigger value="ctas" className="text-xs">CTAs</TabsTrigger>
          <TabsTrigger value="cadence" className="text-xs">Cadence</TabsTrigger>
          <TabsTrigger value="engagement" className="text-xs">Engagement</TabsTrigger>
        </TabsList>
        <TabsContent value="voice"><BrandVoiceTab /></TabsContent>
        <TabsContent value="platform"><PlatformRulesTab /></TabsContent>
        <TabsContent value="audiences"><AudiencesTab /></TabsContent>
        <TabsContent value="campaigns"><CampaignsTab /></TabsContent>
        <TabsContent value="hashtags"><HashtagBanksTab /></TabsContent>
        <TabsContent value="ctas"><CtaBanksTab /></TabsContent>
        <TabsContent value="cadence"><CadenceTargetsTab /></TabsContent>
        <TabsContent value="engagement"><EngagementTargetsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
