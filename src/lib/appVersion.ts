export const APP_VERSION = "1.1.0";

export interface ReleaseNote {
  version: string;
  date: string;
  title: string;
  items: string[];
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "1.1.0",
    date: "2026-10-12",
    title: "Commercial-ready workspace",
    items: [
      "Workspace profile: your company name and logo shown alongside SocialMotive.",
      "Agency or Brand mode, with Clients or Departments labels throughout.",
      "Multiple social accounts per client or department.",
      "Guided setup with a progress checklist on the Dashboard.",
      "Team page: invites, Owner/Admin/Editor/Reviewer/Viewer roles and seat limits.",
      "Usage, activity log, data export and a clean-workspace reset tool.",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-10-09",
    title: "Content operating system",
    items: [
      "Campaign briefs, master content and platform variants.",
      "Posting packages, native previews and AI Preflight review.",
      "SM-NNNN post tracking across every screen; Facebook support.",
    ],
  },
];
