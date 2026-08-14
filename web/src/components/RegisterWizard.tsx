import { useState, type ReactNode } from 'react';
import { BRACKETS } from '../lib/brackets';
import type { Bracket } from '../data/types';
import PlayerBlock, { emptyPlayer, type PlayerFormState } from './PlayerBlock';
import { MIN_PLAYERS, MAX_PLAYERS, validateTeamInfo, validatePlayers, type TeamInfoInput } from '../lib/registration-validation';
import { submitRegistration } from '../lib/submit-registration';
import { CURRENT_SEASON } from '../lib/season';

type TeamInfo = TeamInfoInput;

const EMPTY_TEAM_INFO: TeamInfo = {
  teamName: '',
  bracket: '',
  captainDiscordTag: '',
  logo: null,
  headCoachDiscordTag: '',
  headCoachBattleTag: '',
  hasAssistantCoach: false,
  assistantCoachDiscordTag: '',
  assistantCoachBattleTag: '',
};

const inputClass =
  'w-full rounded-lg border border-gold/20 bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-faint focus:border-gold/50 focus:outline-none';
const labelClass = 'mb-1.5 block text-[13px] font-semibold text-muted-soft';
const buttonClass = 'rounded-lg bg-linear-to-br from-gold-grad-from to-gold-grad-to px-6 py-3 font-display text-base font-bold text-gold-ink';

type Step = 'team' | 'players' | 'review';
type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

function ErrorList({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/8 px-4 py-3 text-sm text-red-300">
      <ul className="list-disc space-y-1 pl-4">
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gold/15 bg-bg-raised p-5">
      <div className="mb-3 font-display text-base font-bold text-ink">{title}</div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-40 shrink-0 text-muted-soft">{label}</span>
      <span className="text-ink">{value || '—'}</span>
    </div>
  );
}

export default function RegisterWizard() {
  const [step, setStep] = useState<Step>('team');
  const [team, setTeam] = useState<TeamInfo>(EMPTY_TEAM_INFO);
  const [players, setPlayers] = useState<PlayerFormState[]>(
    Array.from({ length: MIN_PLAYERS }, emptyPlayer)
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [failedUploads, setFailedUploads] = useState<string[]>([]);
  const [honeypot, setHoneypot] = useState('');

  const staffTags = {
    captainDiscordTag: team.captainDiscordTag,
    headCoachDiscordTag: team.headCoachDiscordTag,
    assistantCoachDiscordTag: team.hasAssistantCoach ? team.assistantCoachDiscordTag : '',
  };

  // Live validity, recomputed every render — drives each "next step" button's
  // visual (not native-disabled) state, so it can still be clicked to reveal
  // exactly what's missing.
  const isReadyForPlayers = validateTeamInfo(team).length === 0;
  const isReadyForReview = isReadyForPlayers && validatePlayers(players, staffTags).length === 0;

  function updateField<K extends keyof TeamInfo>(key: K, value: TeamInfo[K]) {
    setTeam((prev) => ({ ...prev, [key]: value }));
  }

  function goToPlayers() {
    const teamErrors = validateTeamInfo(team);
    setErrors(teamErrors);
    if (teamErrors.length === 0) setStep('players');
  }

  function goToReview() {
    // Re-check team info too — a captain/discord-tag mismatch, for instance,
    // can only be caught once both steps' data is in hand.
    const allErrors = [...validateTeamInfo(team), ...validatePlayers(players, staffTags)];
    setErrors(allErrors);
    if (allErrors.length === 0) setStep('review');
  }

  async function handleSubmit() {
    setSubmitState('submitting');
    try {
      const result = await submitRegistration(team, players, honeypot);
      setFailedUploads(result.failedUploads);
      setSubmitState('success');
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Registration failed — please try again.']);
      setSubmitState('error');
    }
  }

  function updatePlayer(index: number, player: PlayerFormState) {
    setPlayers((prev) => prev.map((p, i) => (i === index ? player : p)));
  }

  function addPlayer() {
    setPlayers((prev) => (prev.length >= MAX_PLAYERS ? prev : [...prev, emptyPlayer()]));
  }

  function removePlayer(index: number) {
    setPlayers((prev) => prev.filter((_, i) => i !== index));
  }

  function removeAssistantCoach() {
    setTeam((prev) => ({ ...prev, hasAssistantCoach: false, assistantCoachDiscordTag: '', assistantCoachBattleTag: '' }));
  }

  if (submitState === 'success') {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-gold/20 bg-bg-raised p-8 text-center">
        <div className="mb-2 font-display text-2xl font-bold text-ink">Team Submitted!</div>
        <p className="text-sm text-muted-soft">
          Thanks — <span className="text-ink">{team.teamName}</span> has been submitted for review. It'll appear on
          the site once LFGS staff approve it.
        </p>
        {failedUploads.length > 0 && (
          <p className="mt-4 text-sm text-red-300">
            Your team was registered, but these files failed to upload: {failedUploads.join(', ')}. Reach out on
            Discord and staff can help you get them added.
          </p>
        )}
      </div>
    );
  }

  if (step === 'team') {
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[2px] text-gold">
          <span>Step 1 of 3</span>
          <span className="text-muted">— Team Info</span>
        </div>

        <p className="mb-6 text-[15px] text-muted-soft">
          Register your team for the Season {CURRENT_SEASON} tournament. It only takes a few minutes to fill out the
          form. Your team will appear on the website once your registration is approved. Please make sure to read the
          rulebook before registering.
        </p>

        <ErrorList errors={errors} />

        <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
          {/* Honeypot — hidden from real visitors via CSS, not display:none
              (some bots skip display:none), but still present for anything
              that blindly autofills every input it finds. */}
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="teamName">
              Team Name
            </label>
            <input
              id="teamName"
              type="text"
              className={inputClass}
              value={team.teamName}
              maxLength={100}
              required
              onChange={(e) => updateField('teamName', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="logo">
              Team Logo
            </label>
            <input
              id="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-gold/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-gold`}
              onChange={(e) => updateField('logo', e.target.files?.[0] ?? null)}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="bracket">
              Bracket
            </label>
            <select
              id="bracket"
              className={inputClass}
              value={team.bracket}
              required
              onChange={(e) => updateField('bracket', e.target.value as Bracket)}
            >
              <option value="" disabled>
                Select a bracket
              </option>
              {BRACKETS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="captainDiscordTag">
              Team Captain's Discord Tag
            </label>
            <input
              id="captainDiscordTag"
              type="text"
              className={inputClass}
              value={team.captainDiscordTag}
              maxLength={100}
              required
              onChange={(e) => updateField('captainDiscordTag', e.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted">Must match the Discord Tag of one of the players on the next page.</p>
          </div>

          <div>
            <label className={labelClass} htmlFor="headCoachDiscordTag">
              Head Coach's Discord Tag
            </label>
            <input
              id="headCoachDiscordTag"
              type="text"
              className={inputClass}
              value={team.headCoachDiscordTag}
              maxLength={100}
              onChange={(e) => updateField('headCoachDiscordTag', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="headCoachBattleTag">
              Head Coach's Battle.net Tag
            </label>
            <input
              id="headCoachBattleTag"
              type="text"
              className={inputClass}
              placeholder="Name#1234"
              value={team.headCoachBattleTag}
              maxLength={100}
              onChange={(e) => updateField('headCoachBattleTag', e.target.value)}
            />
          </div>

          {!team.hasAssistantCoach ? (
            <button
              type="button"
              className="-mt-2 self-start text-xs font-semibold text-gold hover:text-gold-light"
              onClick={() => updateField('hasAssistantCoach', true)}
            >
              + Add Assistant Coach
            </button>
          ) : (
            <div className="-mt-1 rounded-lg border border-gold/15 bg-bg p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[13px] font-semibold text-muted-soft">Assistant Coach</div>
                <button
                  type="button"
                  onClick={removeAssistantCoach}
                  className="text-xs font-semibold text-muted hover:text-ink"
                >
                  Remove
                </button>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className={labelClass} htmlFor="assistantCoachDiscordTag">
                    Assistant Coach Discord Tag
                  </label>
                  <input
                    id="assistantCoachDiscordTag"
                    type="text"
                    className={inputClass}
                    value={team.assistantCoachDiscordTag}
                    maxLength={100}
                    onChange={(e) => updateField('assistantCoachDiscordTag', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="assistantCoachBattleTag">
                    Assistant Coach Battle.net Tag
                  </label>
                  <input
                    id="assistantCoachBattleTag"
                    type="text"
                    className={inputClass}
                    placeholder="Name#1234"
                    value={team.assistantCoachBattleTag}
                    maxLength={100}
                    onChange={(e) => updateField('assistantCoachBattleTag', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            className={`mt-2 ${buttonClass} ${!isReadyForPlayers ? 'opacity-40' : ''}`}
            onClick={goToPlayers}
          >
            Continue to Players →
          </button>
        </form>
      </div>
    );
  }

  if (step === 'review') {
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[2px] text-gold">
          <span>Step 3 of 3</span>
          <span className="text-muted">— Review</span>
        </div>

        <ErrorList errors={errors} />

        <div className="flex flex-col gap-4">
          <ReviewSection title="Team">
            <ReviewRow label="Team Name" value={team.teamName} />
            <ReviewRow label="Bracket" value={team.bracket} />
            <ReviewRow label="Team Logo" value={team.logo?.name ?? ''} />
            <ReviewRow label="Captain's Discord Tag" value={team.captainDiscordTag} />
          </ReviewSection>

          {(team.headCoachDiscordTag || team.headCoachBattleTag) && (
            <ReviewSection title="Head Coach">
              <ReviewRow label="Discord Tag" value={team.headCoachDiscordTag} />
              <ReviewRow label="Battle.net Tag" value={team.headCoachBattleTag} />
            </ReviewSection>
          )}

          {team.hasAssistantCoach && (
            <ReviewSection title="Assistant Coach">
              <ReviewRow label="Discord Tag" value={team.assistantCoachDiscordTag} />
              <ReviewRow label="Battle.net Tag" value={team.assistantCoachBattleTag} />
            </ReviewSection>
          )}

          {players.map((player, index) => (
            <ReviewSection key={index} title={`Player ${index + 1}`}>
              <ReviewRow label="Discord Tag" value={player.discordTag} />
              <ReviewRow label="Battle.net Tag" value={player.battleTag} />
              <ReviewRow
                label="Roles"
                value={[player.roles.tank && 'Tank', player.roles.damage && 'Damage', player.roles.support && 'Support']
                  .filter(Boolean)
                  .join(', ')}
              />
              <ReviewRow
                label="Screenshots"
                value={player.screenshots.filter((f): f is File => f !== null).map((f) => f.name).join(', ')}
              />
            </ReviewSection>
          ))}
        </div>

        <div className="mt-6 flex justify-between">
          <button
            type="button"
            className="text-sm font-semibold text-muted-soft hover:text-ink disabled:opacity-40"
            disabled={submitState === 'submitting'}
            onClick={() => {
              setErrors([]);
              setStep('players');
            }}
          >
            ← Back to Players
          </button>
          <button
            type="button"
            className={`${buttonClass} disabled:opacity-40`}
            disabled={submitState === 'submitting'}
            onClick={handleSubmit}
          >
            {submitState === 'submitting' ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[2px] text-gold">
        <span>Step 2 of 3</span>
        <span className="text-muted">— Players ({players.length}/{MAX_PLAYERS})</span>
      </div>

      <ErrorList errors={errors} />

      <div className="flex flex-col gap-4">
        {players.map((player, index) => (
          <PlayerBlock
            key={index}
            index={index}
            player={player}
            removable={players.length > MIN_PLAYERS}
            onChange={(p) => updatePlayer(index, p)}
            onRemove={() => removePlayer(index)}
          />
        ))}
      </div>

      {players.length < MAX_PLAYERS && (
        <button
          type="button"
          onClick={addPlayer}
          className="mt-4 w-full rounded-lg border border-dashed border-gold/30 py-3 font-display text-sm font-semibold text-gold hover:bg-gold/5"
        >
          + Add Another Player
        </button>
      )}

      <div className="mt-6 flex justify-between">
        <button
          type="button"
          className="text-sm font-semibold text-muted-soft hover:text-ink"
          onClick={() => {
            setErrors([]);
            setStep('team');
          }}
        >
          ← Back to Team Info
        </button>
        <button type="button" className={`${buttonClass} ${!isReadyForReview ? 'opacity-40' : ''}`} onClick={goToReview}>
          Review →
        </button>
      </div>
    </div>
  );
}
