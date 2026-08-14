import {
  ADVANCED_CONFIG,
  BEGINNER_CONFIG,
  INTERMEDIATE_CONFIG,
} from '../music/generator'
import { INVERSIONS, PATTERNS, QUALITIES, type PracticeConfig, type ProgressData, type RecognitionPhase } from '../music/types'
import { inversionLabel, MAJOR_KEYS, patternLabel, qualityLabel, ROOT_OPTIONS } from '../music/theory'

interface Props {
  config: PracticeConfig
  progress: ProgressData
  onChange: (config: PracticeConfig) => void
  onStart: () => void
}

function ToggleGroup<T extends string | number>({
  values,
  selected,
  label,
  format = String,
  onChange,
}: {
  values: readonly T[]
  selected: T[]
  label: string
  format?: (value: T) => string
  onChange: (values: T[]) => void
}) {
  const toggle = (value: T) => {
    if (selected.includes(value)) {
      if (selected.length > 1) onChange(selected.filter((item) => item !== value))
    } else onChange([...selected, value])
  }
  return (
    <fieldset className="filter-group">
      <legend>{label}</legend>
      <div className="chip-grid">
        {values.map((value) => (
          <button
            type="button"
            className={`filter-chip ${selected.includes(value) ? 'selected' : ''}`}
            aria-pressed={selected.includes(value)}
            key={value}
            onClick={() => toggle(value)}
          >
            {format(value)}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

const PHASES: RecognitionPhase[] = ['root-position', 'inversion', 'spread', 'arpeggio']
const PHASE_LABELS: Record<RecognitionPhase, string> = {
  'root-position': 'Root-position block',
  inversion: 'Close inversions',
  spread: 'Spread voicings',
  arpeggio: 'One-bar arpeggios',
}

export function PracticeSetup({ config, progress, onChange, onStart }: Props) {
  const set = <K extends keyof PracticeConfig>(key: K, value: PracticeConfig[K]) => onChange({ ...config, [key]: value })
  const applyPreset = (preset: PracticeConfig) => onChange(structuredClone(preset))
  const hasConstructionPractice = progress.learningAttempts.some((attempt) => attempt.kind === 'construction')

  return (
    <main className="page setup-page">
      <div className="page-heading">
        <p className="eyebrow">CUSTOM PRACTICE</p>
        <h1>Choose one thing to notice.</h1>
        <p>Narrow drills are useful. Your scores remain separate for every recognition skill.</p>
      </div>

      <section className="panel preset-panel">
        <span className="field-label">Presets</span>
        <div className="preset-row">
          <button className="secondary-button" onClick={() => applyPreset(BEGINNER_CONFIG)}>Beginner</button>
          <button className="secondary-button" onClick={() => applyPreset(INTERMEDIATE_CONFIG)}>Intermediate</button>
          <button className="secondary-button" onClick={() => applyPreset(ADVANCED_CONFIG)}>Advanced triads</button>
        </div>
      </section>

      <section className="panel setup-panel">
        <fieldset className="filter-group">
          <legend>Practice style</legend>
          <div className="segmented">
            <button className={config.style === 'learning' ? 'active' : ''} onClick={() => onChange({ ...config, style: 'learning', timer: 0 })}>Learning Mode</button>
            <button className={config.style === 'instant' ? 'active' : ''} onClick={() => onChange({ ...config, style: 'instant', timer: 5 })}>Instant Recognition</button>
          </div>
          <p className="field-help">{config.style === 'learning'
            ? 'Unlimited time, guided derivation, retries and keyboard help.'
            : hasConstructionPractice
              ? 'No hints before answering. Speed and accuracy both count.'
              : 'Available anytime. Build the Chord is recommended first, but never required.'}</p>
        </fieldset>

        <ToggleGroup label="Recognition phase" values={PHASES} selected={[config.phase]} format={(phase) => PHASE_LABELS[phase]} onChange={(values) => set('phase', values.at(-1) ?? 'root-position')} />

        <fieldset className="filter-group">
          <legend>Recognition mode</legend>
          <div className="segmented">
            <button className={config.mode === 'absolute' ? 'active' : ''} onClick={() => set('mode', 'absolute')}>Absolute chord</button>
            <button className={config.mode === 'in-key' ? 'active' : ''} onClick={() => set('mode', 'in-key')}>In key</button>
          </div>
          <p className="field-help">
            {config.mode === 'absolute' ? 'Name the chord without tonal context.' : 'Use the key signature, then name the chord and Roman numeral.'}
          </p>
        </fieldset>

        {config.mode === 'absolute' ? (
          <ToggleGroup
            label="Chord roots"
            values={ROOT_OPTIONS.map((root) => root.pitchClass)}
            selected={config.roots}
            format={(pc) => ROOT_OPTIONS.find((root) => root.pitchClass === pc)?.name ?? ''}
            onChange={(values) => set('roots', values)}
          />
        ) : (
          <ToggleGroup
            label="Major keys"
            values={MAJOR_KEYS.map((key) => key.id)}
            selected={config.keys}
            format={(id) => MAJOR_KEYS.find((key) => key.id === id)?.name ?? id}
            onChange={(values) => set('keys', values)}
          />
        )}

        <ToggleGroup label="Chord qualities" values={QUALITIES} selected={config.qualities} format={qualityLabel} onChange={(values) => set('qualities', values)} />
        {config.phase !== 'root-position' && <ToggleGroup label="Inversions" values={INVERSIONS} selected={config.inversions} format={inversionLabel} onChange={(values) => set('inversions', values)} />}
        {config.phase === 'arpeggio' && <ToggleGroup label="Arpeggio patterns" values={PATTERNS} selected={config.patterns} format={patternLabel} onChange={(values) => set('patterns', values)} />}

        {config.style === 'instant' && <fieldset className="filter-group">
          <legend>Time limit</legend>
          <div className="segmented four">
            {([0, 10, 5, 3] as const).map((timer) => (
              <button key={timer} className={config.timer === timer ? 'active' : ''} onClick={() => set('timer', timer)}>
                {timer === 0 ? 'Unlimited' : `${timer}s`}
              </button>
            ))}
          </div>
        </fieldset>}
      </section>

      <button className="primary-button sticky-start" onClick={onStart}>Start 10-question session <span>→</span></button>
    </main>
  )
}
