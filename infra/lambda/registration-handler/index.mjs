// POST /register — creates a Team + its Team_Members rows (all unapproved)
// from a team-signup wizard submission, and returns presigned S3 POST
// policies for the team logo and each player's screenshots so the browser
// can upload those files directly, without routing file bytes through this
// Lambda. Presigned POST (rather than a presigned PUT URL) is deliberate:
// it's the only S3 presigning mechanism that supports a content-length-range
// condition, so oversized uploads get rejected by S3 itself rather than
// relying on the client's own size check.
//
// Deployed behind API Gateway as `lfgs-registration-handler` (see
// infra/lambda/registration-handler in the repo for how this maps to
// console-configured infra). For local development, run `npm run dev` here
// instead — see local-server.mjs.
//
// Env vars (all but TURNSTILE_SECRET have defaults matching the
// console-configured resources, so nothing else is required to run this
// against production):
//   TEAMS_TABLE            (default: "Teams")
//   TEAM_MEMBERS_TABLE     (default: "Team_Members")
//   MEDIA_BUCKET           (default: "lfgs-media-011122914860-us-east-1-an")
//   REGISTRATION_SEASON    (default: "8" — the season new signups are written
//                           into; local-server.mjs overrides this to "99",
//                           a season nothing on the live site ever queries,
//                           so local testing can't pollute real data)
//   CURRENT_OW_SEASON      (default: "4" — the most recent live Overwatch
//                           season number, used only to label/name the 3
//                           screenshot uploads (S4, S3, S2, ...). Bump this
//                           each time a new OW season starts; unrelated to
//                           REGISTRATION_SEASON above.)
//   ALLOWED_ORIGIN          (default: "https://lfgs.gg" — echoed back on the
//                            response so CORS keeps working when this runs
//                            behind API Gateway's own CORS config too)
//   TURNSTILE_SECRET        (no default — required. Cloudflare Turnstile
//                            secret key, verified against the token the
//                            client solved before any signup work happens.
//                            local-server.mjs defaults this to Cloudflare's
//                            dedicated "always passes" testing secret.)

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

const TEAMS_TABLE = process.env.TEAMS_TABLE ?? 'Teams';
const TEAM_MEMBERS_TABLE = process.env.TEAM_MEMBERS_TABLE ?? 'Team_Members';
const MEDIA_BUCKET = process.env.MEDIA_BUCKET ?? 'lfgs-media-011122914860-us-east-1-an';
const SEASON = Number(process.env.REGISTRATION_SEASON ?? 8);
const CURRENT_OW_SEASON = Number(process.env.CURRENT_OW_SEASON ?? 4);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? 'https://lfgs.gg';
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const MIN_PLAYERS = 5;
const MAX_PLAYERS = 8;
const REQUIRED_SCREENSHOTS_PER_PLAYER = 3;
const MAX_SHORT_STRING = 100;
const ALLOWED_BRACKETS = ['Platinum', 'Diamond'];
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const UPLOAD_URL_EXPIRY_SECONDS = 900;
// Enforced by S3 itself via the presigned POST's content-length-range
// condition below — not just a client-side courtesy. Mirrors
// MAX_FILE_SIZE_BYTES in web/src/lib/registration-validation.ts; keep both
// in sync if this changes.
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
// Blizzard battle tags are "{name}#{digits}" — we only ever show the name
// half publicly, never the full tag, so a player can't be tracked down
// elsewhere from the site alone.
const BATTLE_TAG_PATTERN = /^(.+)#\d+$/;
// Keeps the S3 object's file extension (and therefore the console's
// inferred "Type") matching what was actually uploaded — the PutObject
// Content-Type header alone doesn't drive that column.
const EXTENSION_BY_CONTENT_TYPE = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3Client = new S3Client({});

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Player/team display names come from a battle tag, which can contain
// characters that are awkward in an S3 key (spaces, unicode) — strip
// everything but the safe subset rather than URL-encoding it, so keys stay
// readable in the console.
function sanitizeForKey(value) {
  return value.replace(/[^A-Za-z0-9_-]/g, '');
}

// Screenshot slots are ordered newest-to-oldest in the form (slot 0 is the
// most recent season), so slot j maps to season CURRENT_OW_SEASON - j —
// e.g. with CURRENT_OW_SEASON=4: S4, S3, S2. Filenames ignore whatever the
// browser reports as the original filename (players rarely name them
// accurately) and are instead derived purely from the player's name, slot
// position, and declared content type — matching the {name}_S{n} convention
// already used for season-8 teams' manually-uploaded screenshots.
function screenshotFileName(name, slot, contentType) {
  const owSeason = CURRENT_OW_SEASON - slot;
  const ext = EXTENSION_BY_CONTENT_TYPE[contentType] ?? 'png';
  return `${sanitizeForKey(name)}_S${owSeason}.${ext}`;
}

function isNonEmptyString(value, maxLength = MAX_SHORT_STRING) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

// A staff member (Head Coach / Assistant Coach) is entirely optional, but
// once either of their two fields is filled in, both are required — no such
// thing as a half-entered coach. Returns validation errors for this pair.
function validateOptionalStaff(discordTag, battleTag, label) {
  const errors = [];
  const hasAny = isNonEmptyString(discordTag) || isNonEmptyString(battleTag);
  if (!hasAny) return errors;

  if (!isNonEmptyString(discordTag)) errors.push(`${label}DiscordTag is required`);
  if (!isNonEmptyString(battleTag) || !BATTLE_TAG_PATTERN.test(battleTag)) {
    errors.push(`${label}BattleTag must look like "Name#1234"`);
  }
  return errors;
}

function findStaffPlayerCollisions(players, staffDiscordTag, staffLabel) {
  if (!isNonEmptyString(staffDiscordTag)) return [];
  const tag = staffDiscordTag.trim();
  const collisions = players
    .map((p, i) => (isNonEmptyString(p.discordTag) && p.discordTag.trim() === tag ? i : null))
    .filter((i) => i !== null);
  if (collisions.length === 0) return [];
  return [`${staffLabel}DiscordTag can't also belong to a player (players[${collisions.join(', ')}])`];
}

function findDuplicatePlayerValues(players, key) {
  const seenAt = new Map();
  players.forEach((p, i) => {
    if (!isNonEmptyString(p[key])) return; // already flagged as required elsewhere
    const value = p[key].trim();
    seenAt.set(value, [...(seenAt.get(value) ?? []), i]);
  });

  const errors = [];
  for (const [value, indices] of seenAt) {
    if (indices.length > 1) errors.push(`players[${indices.join(', ')}] share the same ${key} ("${value}")`);
  }
  return errors;
}

// Verifies a Turnstile token with Cloudflare. Any failure — a missing/bad
// token, or Cloudflare itself being unreachable — resolves to false rather
// than throwing, so the caller has one branch to fail closed on. Tokens are
// single-use and expire ~5 minutes after the client solves them.
async function verifyTurnstile(token, remoteIp) {
  if (typeof token !== 'string' || token.length === 0) return false;

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET,
        response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.success === true;
  } catch (err) {
    console.error('Turnstile verification request failed', err);
    return false;
  }
}

// Returns a list of validation error messages — empty array means the
// submission is well-formed. Doesn't touch the network or the honeypot;
// callers check the honeypot separately so a caught bot always gets a
// generic success response instead of a validation error that would help
// it retry correctly.
function validate(body) {
  const errors = [];

  if (!isNonEmptyString(body.teamName)) errors.push('teamName is required');
  if (!ALLOWED_BRACKETS.includes(body.bracket)) {
    errors.push(`bracket must be one of: ${ALLOWED_BRACKETS.join(', ')}`);
  }
  if (!isNonEmptyString(body.captainDiscordTag)) errors.push('captainDiscordTag is required');

  if (body.logo !== null && body.logo !== undefined) {
    if (typeof body.logo !== 'object' || !ALLOWED_IMAGE_TYPES.includes(body.logo.contentType)) {
      errors.push(`logo.contentType must be one of: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
    }
  }

  errors.push(...validateOptionalStaff(body.headCoachDiscordTag, body.headCoachBattleTag, 'headCoach'));
  errors.push(...validateOptionalStaff(body.assistantCoachDiscordTag, body.assistantCoachBattleTag, 'assistantCoach'));

  if (!Array.isArray(body.players) || body.players.length < MIN_PLAYERS || body.players.length > MAX_PLAYERS) {
    errors.push(`players must be an array of ${MIN_PLAYERS}-${MAX_PLAYERS} entries`);
    return errors; // Nothing further to check per-player without a valid array.
  }

  body.players.forEach((player, i) => {
    if (typeof player !== 'object' || player === null) {
      errors.push(`players[${i}] must be an object`);
      return;
    }
    if (!isNonEmptyString(player.discordTag)) errors.push(`players[${i}].discordTag is required`);
    if (!isNonEmptyString(player.battleTag) || !BATTLE_TAG_PATTERN.test(player.battleTag)) {
      errors.push(`players[${i}].battleTag must look like "Name#1234"`);
    }
    const roles = player.roles ?? {};
    if (!roles.tank && !roles.damage && !roles.support) {
      errors.push(`players[${i}].roles must select at least one of tank/damage/support`);
    }
    if (!Array.isArray(player.screenshots) || player.screenshots.length !== REQUIRED_SCREENSHOTS_PER_PLAYER) {
      errors.push(`players[${i}].screenshots must have exactly ${REQUIRED_SCREENSHOTS_PER_PLAYER} entries`);
    } else {
      player.screenshots.forEach((shot, j) => {
        if (typeof shot !== 'object' || !ALLOWED_IMAGE_TYPES.includes(shot?.contentType)) {
          errors.push(`players[${i}].screenshots[${j}].contentType must be one of: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
        }
      });
    }
  });

  errors.push(...findStaffPlayerCollisions(body.players, body.headCoachDiscordTag, 'headCoach'));
  errors.push(...findStaffPlayerCollisions(body.players, body.assistantCoachDiscordTag, 'assistantCoach'));
  errors.push(...findDuplicatePlayerValues(body.players, 'discordTag'));
  errors.push(...findDuplicatePlayerValues(body.players, 'battleTag'));

  return errors;
}

async function presign(key, contentType) {
  const { url, fields } = await createPresignedPost(s3Client, {
    Bucket: MEDIA_BUCKET,
    Key: key,
    Conditions: [
      ['content-length-range', 1, MAX_UPLOAD_BYTES],
      ['eq', '$Content-Type', contentType],
    ],
    Fields: { 'Content-Type': contentType },
    Expires: UPLOAD_URL_EXPIRY_SECONDS,
  });
  return { key, url, fields };
}

// Builds a Head Coach / Assistant Coach Team_Members item, or null if this
// staff slot wasn't filled in — both are entirely optional. Name is derived
// from the battle tag the same way a player's is, for the same reason: the
// raw Discord tag never becomes the public-facing name.
function buildStaffItem(discordTag, battleTag, memberType, teamId) {
  if (!isNonEmptyString(discordTag)) return null;
  const name = BATTLE_TAG_PATTERN.exec(battleTag)[1].trim();
  return {
    teamId,
    memberId: `memberId_${crypto.randomUUID()}`,
    season: SEASON,
    name,
    memberType,
    battleNet: battleTag.trim(),
    discordUsername: discordTag.trim(),
  };
}

// Does the actual work once a submission has passed validation and the
// honeypot check: writes the Team + Team_Members rows (all atomically, so a
// partial failure can't leave an orphaned team with no coach or vice versa),
// and returns presigned upload URLs for every image slot the client needs to
// fill in next.
async function registerTeam(body) {
  const teamId = `teamId_${crypto.randomUUID()}`;
  const teamS3Name = `${slugify(body.teamName)}-${teamId.slice(-6)}`;

  const players = body.players.map((player) => {
    const memberId = `memberId_${crypto.randomUUID()}`;
    const name = BATTLE_TAG_PATTERN.exec(player.battleTag)[1].trim();
    const playerS3Name = `${slugify(name)}-${memberId.slice(-6)}`;
    const roles = player.roles ?? {};
    // Deterministic — same key shape presign() below hands back as upload
    // URLs, so this can be written now even though the files themselves
    // don't land in S3 until the client uploads them afterward.
    const seasonScreenshotImageKeys = player.screenshots.map(
      (shot, j) => `season-${SEASON}/teams/${teamS3Name}/${playerS3Name}/${screenshotFileName(name, j, shot.contentType)}`
    );
    return {
      memberId,
      playerS3Name,
      seasonScreenshotImageKeys,
      item: {
        teamId,
        memberId,
        season: SEASON,
        name,
        memberType: 'Player',
        approved: false,
        captain: player.discordTag.trim() === body.captainDiscordTag.trim() || undefined,
        registeredForTank: roles.tank ? true : undefined,
        registeredForDps: roles.damage ? true : undefined,
        registeredForSupport: roles.support ? true : undefined,
        battleNet: player.battleTag.trim(),
        discordUsername: player.discordTag.trim(),
        seasonScreenshotImageKeys,
      },
    };
  });

  const teamItem = {
    teamId,
    season: SEASON,
    name: body.teamName.trim(),
    bracket: body.bracket,
    approved: false,
    S3Name: teamS3Name,
    ...(body.logo
      ? { logoKey: `season-${SEASON}/teams/${teamS3Name}/logo.${EXTENSION_BY_CONTENT_TYPE[body.logo.contentType] ?? 'png'}` }
      : {}),
  };

  const headCoachItem = buildStaffItem(body.headCoachDiscordTag, body.headCoachBattleTag, 'Head Coach', teamId);
  const assistantCoachItem = buildStaffItem(
    body.assistantCoachDiscordTag,
    body.assistantCoachBattleTag,
    'Assistant Coach',
    teamId
  );

  await dynamoClient.send(
    new TransactWriteCommand({
      TransactItems: [
        { Put: { TableName: TEAMS_TABLE, Item: teamItem } },
        ...(headCoachItem ? [{ Put: { TableName: TEAM_MEMBERS_TABLE, Item: headCoachItem } }] : []),
        ...(assistantCoachItem ? [{ Put: { TableName: TEAM_MEMBERS_TABLE, Item: assistantCoachItem } }] : []),
        ...players.map(({ item }) => ({ Put: { TableName: TEAM_MEMBERS_TABLE, Item: item } })),
      ],
    })
  );

  const logoUpload = body.logo ? await presign(teamItem.logoKey, body.logo.contentType) : null;

  const playerUploads = await Promise.all(
    players.map(async (player, i) => {
      const screenshots = await Promise.all(
        player.seasonScreenshotImageKeys.map((key, j) => presign(key, body.players[i].screenshots[j].contentType))
      );
      return { memberId: player.memberId, screenshots };
    })
  );

  return { teamId, uploads: { logo: logoUpload, players: playerUploads } };
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': ALLOWED_ORIGIN,
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  let body;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return jsonResponse(400, { error: 'Malformed JSON body' });
  }

  // Honeypot: a real visitor never fills this hidden field in. A bot that
  // does gets a fake success so it has no signal to adapt against. Checked
  // first since it's free — no reason to spend a Turnstile verification
  // call on a submission this already condemns.
  if (body.website) {
    return jsonResponse(200, { ok: true });
  }

  // Fail closed: registration stays open for weeks at a time, so a briefly
  // unavailable Turnstile service should block signups rather than silently
  // let everything through.
  const turnstileOk = await verifyTurnstile(body.turnstileToken, event.requestContext?.http?.sourceIp);
  if (!turnstileOk) {
    return jsonResponse(403, { error: 'Verification failed — please try again, or contact LFGS staff on Discord.' });
  }

  const errors = validate(body);
  if (errors.length > 0) {
    return jsonResponse(400, { error: 'Validation failed', details: errors });
  }

  try {
    const result = await registerTeam(body);
    return jsonResponse(200, result);
  } catch (err) {
    console.error('Registration failed', err);
    return jsonResponse(500, { error: 'Registration failed — please try again' });
  }
}

export { validate, registerTeam };
