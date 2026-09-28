# CiberNews — Cybersecurity News Forum & Aggregator Implementation Plan

## Goal Description
A self-updating, bilingual (`EN` / `ES`) cybersecurity news aggregator and community discussion forum inspired by Hacker News, `r/netsec`, and SOC threat intelligence dashboards.

## Finalized Architecture & Decisions
1. **Stack**: Full-stack **Next.js (App Router) + TypeScript + SQLite (Prisma ORM) + Tailwind CSS**.
2. **Authentication**: Simple, self-contained login & registration (`scrypt` password hashing + HMAC session cookie) with 1-click demo login (`@analyst` / `cyber123` and `@zero_cool` / `admin123`).
3. **Bilingual Threat Feeds (`EN` & `ES`)**:
   - **English**: *The Hacker News*, *BleepingComputer*, *CISA Advisories*, *Krebs on Security*, *Dark Reading*
   - **Spanish**: *Una al Día (Hispasec)*, *WeLiveSecurity (ES)*, *INCIBE Avisos*
4. **Core Forum & Threat Intelligence Features**:
   - Automated RSS/Atom feed ingestion (`POST /api/feeds/sync`)
   - Rule-based bilingual severity classifier (`CRITICAL`, `HIGH`, `MEDIUM`, `INFO`) & automatic `CVE-YYYY-NNNNN` badge extraction
   - Hacker News-style **Hot**, **New**, **Critical & CVEs**, **Top**, **Discussions**, and **Saved Bookmarks** views
   - Per-user persistent upvoting/downvoting, bookmarking, custom thread creation, and nested discussion comments
