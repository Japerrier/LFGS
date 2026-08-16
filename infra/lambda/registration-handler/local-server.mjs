// Local stand-in for the deployed API Gateway + Lambda, for developing the
// signup wizard without needing real infra in the loop. Runs the exact same
// handler code as production, against real DynamoDB/S3 (using whatever AWS
// credentials are active in this shell — same convention as scripts/), but
// writes are pinned to REGISTRATION_SEASON=99, a season nothing on the live
// site ever queries, so repeated test submissions can't pollute real data.
//
// Requires AWS credentials configured locally (e.g. `aws configure` or an
// AWS_PROFILE env var) with the same permissions as the deployed Lambda's
// IAM role (lfgs-registration-lambda-role).
//
// Usage: $env:AWS_PROFILE = "lfgs"; npm run dev
// Then point the wizard's dev build at http://localhost:8787/register

import { createServer } from 'node:http';

process.env.REGISTRATION_SEASON ??= '99';
process.env.ALLOWED_ORIGIN ??= 'http://localhost:4321';
// Cloudflare's dedicated "always passes" secret key — pairs with the matching
// test site key in web/.env.example. Verifies successfully against any token
// minted by that test site key, regardless of hostname.
process.env.TURNSTILE_SECRET ??= '1x0000000000000000000000000000000AA';

const { handler } = await import('./index.mjs');

const PORT = process.env.PORT ?? 8787;

createServer(async (req, res) => {
  const origin = process.env.ALLOWED_ORIGIN;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'POST',
      'access-control-allow-headers': 'content-type',
    });
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/register') {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found — this dev server only handles POST /register' }));
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks).toString('utf8');

  const result = await handler({ body: rawBody });

  res.writeHead(result.statusCode, result.headers);
  res.end(result.body);
}).listen(PORT, () => {
  console.log(`Registration dev server listening at http://localhost:${PORT}/register`);
  console.log(`Writing test data under season ${process.env.REGISTRATION_SEASON} (invisible to the real site).`);
});
