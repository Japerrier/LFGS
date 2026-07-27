# LFGS — Looking For Gold Scrims

The site for LFGS, a fan-run Overwatch community scrim & tournament server. It covers team rosters, weekly schedules, matchups, playoff brackets, and a Hall of Fame going back to Season 3.

## About this project

This is also a portfolio project, built as a demonstration of AI-assisted development. Most of the feature work, styling, and infrastructure planning in this repo — including the AWS/DynamoDB architecture described below — was built in collaboration with [Claude Code](https://claude.com/claude-code).

## Tech stack

- [Astro](https://astro.build) — static site generation
- [React](https://react.dev) — for interactive components where needed
- [Tailwind CSS v4](https://tailwindcss.com) — styling
- TypeScript throughout

## Architecture

The site (`web/`) currently builds to fully static HTML/CSS/JS. Team, roster, and match data live in hardcoded TypeScript files for now, standing in for the real backend while it's built out.

The planned production setup:

- **S3 + CloudFront + Route53** for static hosting, with a [CloudFront Function](infra/cloudfront-functions/url-rewrite.js) handling clean-URL rewriting so pretty routes resolve correctly against S3.
- **DynamoDB** — Teams, Team Members, and Matchups tables, each scoped by season so historical tournament data is preserved rather than overwritten each time a new season starts.
- **Rebuild-on-change, not client-side fetching.** A DynamoDB Streams-triggered Lambda kicks off a fresh static build via [GitHub Actions](.github/workflows/deploy.yml) whenever the data changes, rather than the live site querying the database on every page load — a deliberate tradeoff of a few minutes of propagation delay in exchange for a site with zero runtime API surface and no request-time latency.
- **Terraform**, once the AWS resources exist. Infrastructure is being built by hand in the AWS console first to build real hands-on familiarity, then formalized as Terraform afterward.

## Getting started

```bash
cd web
npm install
npm run dev
```

The dev server runs at `http://localhost:4321`.

## License

[PolyForm Noncommercial License 1.0.0](LICENSE) — free to view, run, and learn from for noncommercial purposes; commercial use isn't permitted.
