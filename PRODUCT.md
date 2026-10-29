# Justin Rogowski's website

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

A personal site with professional links, standalone tools, and experiments. The new Updates section is a personal publishing space where Justin posts rich text updates and readers read and comment.

## Users

Justin writes and manages posts. Readers browse updates and leave comments. Confluence Cloud readers see a compact version embedded in an iframe and can open the full post.

## Operating Context

The existing repository is plain HTML, CSS, and JavaScript. It was imported into Vercel at https://justinrogo.vercel.app/ and also has a GitHub Pages deployment workflow. Preserve existing tools and pages.

## Capabilities and Constraints

Updates supports optional link-preview cards and inline YouTube videos, following the user's Teams screenshot reference. Authors control whether previews are attached and whether a YouTube link is shown as a card or player. Existing posts and the database schema must continue working.

Confirmed: rich text posts, comments, an RSS feed, and a compact iframe view for Confluence Cloud at https://uconn.atlassian.net. Updates must use a separate Supabase project from the Front Desk Planner.

Implementation decisions: public published posts; author-only publishing; authenticated comments that publish immediately, with a 30-second per-account throttle; drafts excluded from public endpoints and RSS. Older pending comments retain the author's approval queue. On wide screens, post text and attached media use a 75/25 split. Credentials and database setup must be supplied through the documented deployment setup, never embedded in source.

## Evidence on Hand

README.md, index.html, style.css, main.js, and data/pages.json describe and implement the existing site. No real Updates posts have been supplied; preview examples must be labeled and never appear in the published feed.
