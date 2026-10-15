# Social Motive

Start in Plan mode. Do not write code yet.

I want to build an internal web app called NuDaze Social Copilot for the NuDaze team.

This app is a content operations and post assembly tool, not an auto‑publishing tool. Its job is to ingest NuDaze content assets, strategy rules, connected documents, linked webpages, and repurposable NuDaze-related social content, then generate ready-to-use post ideas for LinkedIn and Instagram in a structured, copy-ready format.

Please first propose and wait for approval on:

Information architecture

User roles and permissions

Source ingestion model

Data model

AI generation workflow

Approval workflow

Recommended v1 scope vs later-phase features

Core v1 requirements

Support manual uploads of images, videos, PDFs, links, text snippets, decks, testimonials, and case studies

Support connected source architecture for Google-based systems and Microsoft / SharePoint / OneDrive if possible, or design the app so those connectors can be added cleanly later

Summarize linked webpages and existing NuDaze documents before generating posts

Look for NuDaze-tagged or NuDaze-origin content that can be repurposed across platforms

Show source provenance on each generated output

Generate one post card per idea, per platform

Required outputs

Instagram feed posts: 5 per week

Instagram Stories: 2 per day

Instagram Reels: 3 per week

LinkedIn posts: 5 per week

Meaningful daily comments on relevant industry posts: 10 per day

Post card fields
Each output card should include:

Platform

Content type (LinkedIn post, Instagram feed post, Story, Reel, or comment)

Objective

Audience

Campaign or content pillar

Draft copy

Suggested image or video asset

Hashtags

Recommended people tags

Recommended organization tags

Source references used

Short rationale

Approval status

One-click copy buttons for copy, hashtags, and tags separately

Admin behavior
Admin users can edit strategy rules, manage sources, generate content, review content, approve content, and export/copy content.
Non-admin users can review, generate within allowed settings, and export/copy approved content, but should not be able to edit global strategy settings.

Generation rules
The app should generate content logically from approved sources and strategy rules, not random copy.
It should avoid duplicate hooks, repetitive hashtags, repeated CTAs, and generic AI-sounding language.
Comments should feel human, useful, specific, and non-spammy.

Core modules for v1

Asset Library

Connected Sources

Strategy and Rules

AI Post Generator

Daily Content Queue

Comment Generator

Approved Content Library

Repurpose / Repost Center

UX direction
Make this feel like a premium internal strategy tool for a marketing team: clean, fast, structured, modern, and easy to scan. Prioritize clarity and usability over flashy design.

Before building anything, ask any critical clarification questions and show the recommended v1 architecture in Plan mode. 
Optimize for a clean first version with the right architecture, not maximum feature count.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://nu-daze-spark.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7f7e2847-bdde-4669-adb4-8316869e65a4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
