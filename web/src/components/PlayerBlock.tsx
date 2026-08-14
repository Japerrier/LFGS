import { MAX_SCREENSHOTS_PER_PLAYER, screenshotSeasonLabel } from '../lib/registration-validation';

export interface PlayerFormState {
  discordTag: string;
  battleTag: string;
  roles: { tank: boolean; damage: boolean; support: boolean };
  screenshots: (File | null)[];
}

export function emptyPlayer(): PlayerFormState {
  return {
    discordTag: '',
    battleTag: '',
    roles: { tank: false, damage: false, support: false },
    // Fixed-length, null-filled (not []) — screenshots are indexed by slot
    // via updateScreenshot below, and a null-filled array lets validation
    // just check "no null left" instead of dealing with sparse-array holes.
    screenshots: [null, null, null],
  };
}

interface Props {
  index: number;
  player: PlayerFormState;
  removable: boolean;
  onChange: (player: PlayerFormState) => void;
  onRemove: () => void;
}

const inputClass =
  'w-full rounded-lg border border-gold/20 bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-faint focus:border-gold/50 focus:outline-none';
const labelClass = 'mb-1.5 block text-[13px] font-semibold text-muted-soft';

export default function PlayerBlock({ index, player, removable, onChange, onRemove }: Props) {
  function updateRole(role: keyof PlayerFormState['roles'], value: boolean) {
    onChange({ ...player, roles: { ...player.roles, [role]: value } });
  }

  function updateScreenshot(slot: number, file: File | null) {
    const screenshots = [...player.screenshots];
    screenshots[slot] = file;
    onChange({ ...player, screenshots });
  }

  return (
    <div className="rounded-xl border border-gold/15 bg-bg-raised p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="font-display text-base font-bold text-ink">Player {index + 1}</div>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-semibold text-muted hover:text-ink"
          >
            Remove
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor={`discordTag-${index}`}>
            Discord Tag
          </label>
          <input
            id={`discordTag-${index}`}
            type="text"
            className={inputClass}
            value={player.discordTag}
            maxLength={100}
            required
            onChange={(e) => onChange({ ...player, discordTag: e.target.value })}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor={`battleTag-${index}`}>
            Battle.net Tag
          </label>
          <input
            id={`battleTag-${index}`}
            type="text"
            className={inputClass}
            placeholder="Name#1234"
            value={player.battleTag}
            maxLength={100}
            required
            onChange={(e) => onChange({ ...player, battleTag: e.target.value })}
          />
        </div>

        <div>
          <div className={labelClass}>Registered Role(s)</div>
          <div className="flex gap-4">
            {(['tank', 'damage', 'support'] as const).map((role) => (
              <label key={role} className="flex items-center gap-1.5 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={player.roles[role]}
                  onChange={(e) => updateRole(role, e.target.checked)}
                />
                {role === 'tank' ? 'Tank' : role === 'damage' ? 'Damage' : 'Support'}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className={labelClass}>3 Most Recent Overwatch Season Profile Screenshots (required)</div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: MAX_SCREENSHOTS_PER_PLAYER }).map((_, slot) => {
              const hasFile = player.screenshots[slot] !== null;
              return (
                <div key={slot} className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-muted-soft">
                    {screenshotSeasonLabel(slot)}
                    {slot === 0 ? ' (most recent)' : ''}
                  </span>
                  {/* Native file inputs render a filename after the button that
                      can't be styled or truncated, and overflows the column at
                      narrow widths — so the input itself is visually hidden
                      (not display:none, so it stays keyboard/AT accessible) in
                      favor of a fixed-width label-as-button plus our own status
                      text below it. We only show selected/not-selected (not the
                      filename) since submitted filenames aren't trusted anyway. */}
                  <label className="flex cursor-pointer items-center justify-center rounded-md bg-gold/15 px-2 py-1.5 text-xs font-semibold text-gold hover:bg-gold/25">
                    Choose File
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(e) => updateScreenshot(slot, e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <span className={`text-[11px] ${hasFile ? 'text-gold' : 'text-muted-soft'}`}>
                    {hasFile ? '✓ Selected' : 'Not selected'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
