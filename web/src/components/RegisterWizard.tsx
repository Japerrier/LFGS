import { useState } from 'react';
import { BRACKETS } from '../lib/brackets';
import type { Bracket } from '../data/types';
import PlayerBlock, { emptyPlayer, type PlayerFormState } from './PlayerBlock';

interface TeamInfo {
  teamName: string;
  bracket: Bracket | '';
  headCoachName: string;
  captainDiscordTag: string;
  logo: File | null;
}

const EMPTY_TEAM_INFO: TeamInfo = {
  teamName: '',
  bracket: '',
  headCoachName: '',
  captainDiscordTag: '',
  logo: null,
};

// Mirrors MIN_PLAYERS/MAX_PLAYERS in infra/lambda/registration-handler/index.mjs —
// duplicated rather than shared since the wizard and the Lambda are separate
// deployables (same convention scripts/ already uses for its own small helpers).
const MIN_PLAYERS = 5;
const MAX_PLAYERS = 8;

const inputClass =
  'w-full rounded-lg border border-gold/20 bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-faint focus:border-gold/50 focus:outline-none';
const labelClass = 'mb-1.5 block text-[13px] font-semibold text-muted-soft';
const buttonClass = 'rounded-lg bg-linear-to-br from-gold-grad-from to-gold-grad-to px-6 py-3 font-display text-base font-bold text-gold-ink';

type Step = 'team' | 'players';

export default function RegisterWizard() {
  const [step, setStep] = useState<Step>('team');
  const [team, setTeam] = useState<TeamInfo>(EMPTY_TEAM_INFO);
  const [players, setPlayers] = useState<PlayerFormState[]>(
    Array.from({ length: MIN_PLAYERS }, emptyPlayer)
  );

  function updateField<K extends keyof TeamInfo>(key: K, value: TeamInfo[K]) {
    setTeam((prev) => ({ ...prev, [key]: value }));
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

  if (step === 'team') {
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[2px] text-gold">
          <span>Step 1 of 3</span>
          <span className="text-muted">— Team Info</span>
        </div>

        <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
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
            <label className={labelClass} htmlFor="headCoachName">
              Team Head Coach
            </label>
            <input
              id="headCoachName"
              type="text"
              className={inputClass}
              value={team.headCoachName}
              maxLength={100}
              required
              onChange={(e) => updateField('headCoachName', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="captainDiscordTag">
              Team Captain's Discord Tag
            </label>
            <input
              id="captainDiscordTag"
              type="text"
              className={inputClass}
              placeholder="username#0000 or username"
              value={team.captainDiscordTag}
              maxLength={100}
              required
              onChange={(e) => updateField('captainDiscordTag', e.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted">Must match the Discord Tag you enter for that player below.</p>
          </div>

          <button type="button" className={`mt-2 ${buttonClass}`} onClick={() => setStep('players')}>
            Continue to Players →
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[2px] text-gold">
        <span>Step 2 of 3</span>
        <span className="text-muted">— Players ({players.length}/{MAX_PLAYERS})</span>
      </div>

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
        <button type="button" className="text-sm font-semibold text-muted-soft hover:text-ink" onClick={() => setStep('team')}>
          ← Back to Team Info
        </button>
        {/* Validation + submission land in the next pieces of this wizard. */}
        <button type="button" disabled className={`${buttonClass} opacity-40`}>
          Review &amp; Submit →
        </button>
      </div>
    </div>
  );
}
