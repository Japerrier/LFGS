## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

If you started a background server yourself, stop it with `astro dev stop` before ending your session — don't leave it orphaned.

**Never run `astro dev stop` as a just-in-case/defensive step.** The lock file (`.astro/dev.json`) doesn't distinguish who started a server — a plain foreground `astro dev` (e.g. `npm run dev` in a terminal) writes to the same lock file as `--background` mode, and `astro dev stop` kills whatever PID is currently recorded there. Running it defensively can kill a dev server someone else (e.g. Jonathan, in a VS Code terminal) is actively using.

If you hit "Another astro dev server is already running" and suspect the lock is stale (nothing actually running, likely orphaned by an earlier ungraceful shutdown): confirm first — check `astro dev status`, and only run `astro dev stop` once you're confident no one has a real server up. When in doubt, ask before stopping.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
