import type { ProgressData, SkillStat } from '../music/types'
import { INTERVAL_LABELS, inversionLabel, patternLabel, qualityLabel, ROOT_OPTIONS } from '../music/theory'

function mean(items: SkillStat[]): number {
  return items.length ? items.reduce((sum, item) => sum + item.score, 0) / items.length : 0
}

function labelForSkill(key: string): string {
  const [kind, value] = key.split(':')
  if (kind === 'root') return ROOT_OPTIONS.find((root) => root.pitchClass === Number(value))?.name ?? value
  if (kind === 'quality') return qualityLabel(value as 'major' | 'minor' | 'diminished')
  if (kind === 'inversion') return inversionLabel(Number(value))
  if (kind === 'pattern') return patternLabel(value)
  if (kind === 'degree') return ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'][Number(value)]
  if (kind === 'interval') return INTERVAL_LABELS[value as keyof typeof INTERVAL_LABELS] ?? value.replaceAll('-', ' ')
  if (kind === 'construction') return qualityLabel(value as 'major' | 'minor' | 'diminished')
  if (kind === 'phase') return value.replaceAll('-', ' ')
  if (kind === 'spelling') return value.replaceAll('-', ' ')
  return value
}

function SkillSection({ title, prefix, progress }: { title: string; prefix: string; progress: ProgressData }) {
  const entries = Object.entries(progress.skills)
    .filter(([key]) => key.startsWith(`${prefix}:`))
    .sort((a, b) => a[1].score - b[1].score)
  return (
    <section className="panel skill-section">
      <div className="skill-section-heading">
        <h2>{title}</h2>
        <span>{entries.length ? `${Math.round(mean(entries.map(([, stat]) => stat)) * 100)}%` : 'New'}</span>
      </div>
      {entries.length === 0 ? <p className="empty-copy">Complete a session to map this skill.</p> : (
        <div className="skill-bars">
          {entries.map(([key, stat]) => (
            <div className="skill-row" key={key}>
              <div><strong>{labelForSkill(key)}</strong><small>{stat.attempts} attempts · {(stat.averageMs / 1000).toFixed(1)}s</small></div>
              <div className="mastery-track"><i style={{ width: `${Math.round(stat.score * 100)}%` }} /></div>
              <b>{Math.round(stat.score * 100)}</b>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function ProgressView({ progress }: { progress: ProgressData }) {
  const recent = progress.attempts.slice(-20)
  const accuracy = recent.length ? recent.filter((attempt) => attempt.result.allCorrect).length / recent.length : 0
  const averageMs = recent.length ? recent.reduce((sum, attempt) => sum + attempt.responseMs, 0) / recent.length : 0
  const confusions = Object.entries(progress.confusions).sort((a, b) => b[1] - a[1]).slice(0, 4)

  return (
    <main className="page progress-page">
      <div className="page-heading">
        <p className="eyebrow">YOUR HARMONY MAP</p>
        <h1>Progress by skill.</h1>
        <p>A low score is a useful target, not a verdict. Quick Practice weighs these skills more heavily.</p>
      </div>
      <section className="summary-grid">
        <div className="summary-card"><span>Recent accuracy</span><strong>{recent.length ? `${Math.round(accuracy * 100)}%` : '—'}</strong><small>last {recent.length || 0} answers</small></div>
        <div className="summary-card"><span>Recognition time</span><strong>{recent.length ? `${(averageMs / 1000).toFixed(1)}s` : '—'}</strong><small>average response</small></div>
        <div className="summary-card"><span>Total exercises</span><strong>{progress.attempts.length + progress.learningAttempts.length}</strong><small>stored on this device</small></div>
      </section>

      <div className="skill-layout">
        <SkillSection title="Chord construction" prefix="construction" progress={progress} />
        <SkillSection title="Useful intervals" prefix="interval" progress={progress} />
        <SkillSection title="Spelling method" prefix="spelling" progress={progress} />
        <SkillSection title="Learning phases" prefix="phase" progress={progress} />
        <SkillSection title="Chord roots" prefix="root" progress={progress} />
        <SkillSection title="Chord quality" prefix="quality" progress={progress} />
        <SkillSection title="Inversions" prefix="inversion" progress={progress} />
        <SkillSection title="Arpeggio patterns" prefix="pattern" progress={progress} />
        <SkillSection title="Roman numerals" prefix="degree" progress={progress} />
      </div>

      <section className="panel confusion-panel">
        <h2>Recurring confusions</h2>
        {confusions.length ? (
          <div className="confusion-list">
            {confusions.map(([key, count]) => {
              const [dimension, pair] = key.split(':')
              return <div key={key}><span>{dimension}</span><strong>{pair}</strong><b>{count}×</b></div>
            })}
          </div>
        ) : <p className="empty-copy">No recurring confusions yet.</p>}
      </section>
    </main>
  )
}
