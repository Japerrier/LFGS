import { useState } from 'react';
import { BRACKETS } from '../lib/brackets';
import type { Bracket } from '../data/types';

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

const inputClass =
  'w-full rounded-lg border border-gold/20 bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-faint focus:border-gold/50 focus:outline-none';
const labelClass = 'mb-1.5 block text-[13px] font-semibold text-muted-soft';

export default function RegisterWizard() {
  const [team, setTeam] = useState<TeamInfo>(EMPTY_TEAM_INFO);

  function updateField<K extends keyof TeamInfo>(key: K, value: TeamInfo[K]) {
    setTeam((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[2px] text-gold">
        <span>Step 1 of 3</span>
        <span className="text-muted">— Team Info</span>
      </div>

      <form className="flex flex-col gap-5">
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

        {/* Player steps land in the next piece of this wizard — this button
            is a placeholder until there's a step 2 to advance to. */}
        <button
          type="button"
          disabled
          className="mt-2 rounded-lg bg-linear-to-br from-gold-grad-from to-gold-grad-to px-6 py-3 font-display text-base font-bold text-gold-ink opacity-40"
        >
          Continue to Players →
        </button>
      </form>
    </div>
  );
}
