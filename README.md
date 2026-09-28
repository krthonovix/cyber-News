# CiberNews // Cybersecurity Intelligence Forum & Threat Feed

A self-updating bilingual (**English & Español**) cybersecurity news aggregator, CVE tracker, and analyst discussion forum built with **Next.js, TypeScript, Prisma (SQLite), and Tailwind CSS**.

## Features
- **Automated Bilingual RSS/Atom Ingestion**: Pulls live breaking cybersecurity news from *The Hacker News*, *BleepingComputer*, *CISA Advisories*, *Krebs on Security*, *Dark Reading*, *Una al Día (Hispasec)*, *WeLiveSecurity ES*, and *INCIBE*.
- **Automatic Threat & CVE Classification**: Detects `CVE-YYYY-NNNNN` identifiers and classifies articles into severity levels (`CRITICAL`, `HIGH`, `MEDIUM`, `INFO`) and threat categories (`Zero-Day`, `Ransomware`, `Data Breach`, `Malware`, `Vulnerability`, `Patch / Advisory`, `Phishing`, `APT / Threat Intel`, `Cloud & AI`).
- **Interactive Forum Experience**:
  - Upvote/downvote security stories and custom discussion threads
  - Filter by **Hot**, **Breaking / New**, **Critical & CVEs**, **Top Upvoted**, **Discussions**, or **Saved Bookmarks**
  - Switch between **ALL**, **🇺🇸 EN**, and **🇪🇸 ES** feeds
  - Full nested comment discussions per news thread
  - Simple built-in authentication + 1-click Demo Analyst Login (`analyst` / `cyber123`)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Initialize & seed SQLite database
npm run db:setup

# 3. Start the development server
npm run dev
```

Open `http://localhost:3000` in your browser.
