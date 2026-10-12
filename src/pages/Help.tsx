import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useWorkspace, ROLE_META, type WorkspaceRole } from "@/hooks/useWorkspace";

export default function Help() {
  const { entityPlural, entitySingular } = useWorkspace();
  const topics = [
    { q: "How does content flow through SocialMotive?", a: <>Write a <Link className="underline" to="/briefs">Campaign Brief</Link> and approve it. Generate a content set — one core message plus LinkedIn, Instagram and Facebook versions. Review drafts in the <Link className="underline" to="/queue">Daily Queue</Link>, run AI Preflight, approve, then copy or export from <Link className="underline" to="/approved">Approved Content</Link>. Each post keeps its SM-NNNN number on every screen.</> },
    { q: `What is a ${entitySingular.toLowerCase()}?`, a: <>Each {entitySingular.toLowerCase()} has its own social accounts, assets, strategy, drafts and team. Switch between {entityPlural.toLowerCase()} with the selector at the top right. Manage them in <Link className="underline" to="/settings/clients">{entityPlural}</Link>.</> },
    { q: "Who can do what?", a: <ul className="list-disc pl-5">{(Object.keys(ROLE_META) as WorkspaceRole[]).map((r) => <li key={r}><strong>{ROLE_META[r].label}:</strong> {ROLE_META[r].description}</li>)}</ul> },
    { q: "How do I add a teammate?", a: <>An Admin creates an invite on the <Link className="underline" to="/settings/team">Team</Link> page and shares the sign-up link. They get access as soon as they sign up with the invited email.</> },
    { q: "Does SocialMotive publish posts for me?", a: <>No. SocialMotive prepares ready-to-post packages; your team posts manually. This keeps a human in control of every post.</> },
    { q: "What does AI Preflight check?", a: <>Brand voice, banned phrases, length limits, repetition, missing media or sources, unsupported claims, and complete Story/Reel outlines. Blocking issues must be fixed or overridden by an Admin with a reason.</> },
    { q: "How do I get my data out?", a: <>Admins can download everything, or one {entitySingular.toLowerCase()} at a time, from <Link className="underline" to="/settings/workspace">Workspace settings</Link>.</> },
  ];
  return (
    <div className="animate-fade-in max-w-3xl">
      <PageHeader title="Help" description="Quick answers about using SocialMotive." />
      <Accordion type="single" collapsible className="rounded-md border border-border px-4">
        {topics.map((t) => (
          <AccordionItem key={t.q} value={t.q}><AccordionTrigger className="text-left">{t.q}</AccordionTrigger><AccordionContent className="text-sm text-muted-foreground">{t.a}</AccordionContent></AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
