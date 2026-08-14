import { useEffect, useRef, useState } from 'react'
import { generateIntervalExercise } from '../music/generator'
import type { ErrorCause, IntervalAttempt, IntervalKind, ProgressData } from '../music/types'
import {
  COMMON_ROOT_PITCH_CLASSES,
  INTERVAL_LABELS,
  ROOT_OPTIONS,
  letterDistancePath,
} from '../music/theory'
import { PitchStaff } from './PitchStaff'

const INTERVALS: IntervalKind[] = ['major-third', 'minor-third', 'perfect-fifth']

interface Props {
  progress: ProgressData
  onRecord: (attempt: IntervalAttempt) => void
  onExit: () => void
}

export function IntervalSession({ progress, onRecord, onExit }: Props) {
  const pastCount = progress.learningAttempts.filter((attempt) => attempt.kind === 'interval').length
  const roots = pastCount < 20 ? COMMON_ROOT_PITCH_CLASSES : ROOT_OPTIONS.map((root) => root.pitchClass)
  const intervalPool = INTERVALS.flatMap((interval) => (progress.skills[`interval:${interval}`]?.score ?? 0.4) < 0.7 ? [interval, interval] : [interval])
  const [exercise, setExercise] = useState(() => generateIntervalExercise(roots, intervalPool))
  const [selected, setSelected] = useState<IntervalKind | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [hint, setHint] = useState(false)
  const [question, setQuestion] = useState(1)
  const [correctCount, setCorrectCount] = useState(0)
  const [finished, setFinished] = useState(false)
  const startedAt = useRef<number | null>(null)

  useEffect(() => { startedAt.current = performance.now() }, [exercise.id])

  const check = () => {
    if (!selected || submitted) return
    const correct = selected === exercise.interval
    const errorTags: ErrorCause[] = correct ? [] : ['interval-error']
    onRecord({
      id: crypto.randomUUID(),
      kind: 'interval',
      timestamp: Date.now(),
      lower: exercise.lower,
      upper: exercise.upper,
      interval: exercise.interval,
      selected,
      correct,
      responseMs: Math.max(1, Math.round(performance.now() - (startedAt.current ?? performance.now()))),
      errorTags,
    })
    if (correct) setCorrectCount((count) => count + 1)
    setSubmitted(true)
  }

  const next = () => {
    if (question >= 10) { setFinished(true); return }
    setQuestion((value) => value + 1)
    let nextExercise = generateIntervalExercise(roots, intervalPool)
    for (let tries = 0; tries < 5 && nextExercise.lower.pitchClass === exercise.lower.pitchClass && nextExercise.interval === exercise.interval; tries += 1) {
      nextExercise = generateIntervalExercise(roots, intervalPool)
    }
    setExercise(nextExercise)
    setSelected(null)
    setSubmitted(false)
    setHint(false)
  }

  if (finished) {
    return (
      <main className="page session-complete">
        <div className="completion-mark">↕</div>
        <p className="eyebrow">INTERVAL LAB COMPLETE</p>
        <h1>{correctCount} / 10</h1>
        <p>These intervals are useful because they are the internal structure of triads.</p>
        <button className="primary-button" onClick={onExit}>Back home</button>
      </main>
    )
  }

  const letterSteps = exercise.interval === 'perfect-fifth' ? 4 : 2
  const path = letterDistancePath(exercise.lower.name, letterSteps)
  const isCorrect = selected === exercise.interval

  return (
    <main className="learning-session interval-session page">
      <header className="learning-header">
        <button className="icon-button" onClick={onExit} aria-label="Leave session">×</button>
        <div><p className="eyebrow">INTERVALS FOR CHORDS · {question}/10</p><h1>{exercise.lower.name} → {exercise.upper.name}</h1></div>
        <div className="formula-badge">?</div>
      </header>
      <section className="panel interval-card">
        <PitchStaff pitches={[exercise.lower, exercise.upper]} mode="sequential" label={`${exercise.lower.name} followed by ${exercise.upper.name}`} />
        <h2>What interval is this?</h2>
        <p>Use the letter distance first; use pitch distance only to decide the quality.</p>
        <div className="interval-options">
          {INTERVALS.map((interval) => (
            <button
              key={interval}
              disabled={submitted}
              className={`${selected === interval ? 'selected' : ''} ${submitted && interval === exercise.interval ? 'correct' : ''} ${submitted && selected === interval && !isCorrect ? 'wrong' : ''}`}
              onClick={() => setSelected(interval)}
            >{INTERVAL_LABELS[interval]}</button>
          ))}
        </div>
        {!submitted ? (
          <>
            {hint && <div className="progressive-hint"><b>Letter-first hint</b><p>{path.join(' → ')}. So this is some kind of {exercise.interval === 'perfect-fifth' ? '5th' : '3rd'}. Now decide its quality.</p></div>}
            <div className="builder-actions"><button className="hint-button" onClick={() => setHint(true)}>Show letter path</button><button className="primary-button" disabled={!selected} onClick={check}>Check interval</button></div>
          </>
        ) : (
          <div className={`interval-feedback ${isCorrect ? 'correct' : 'wrong'}`}>
            <p className="eyebrow">{isCorrect ? 'USEFUL PATTERN' : 'CONNECT THE DISTANCES'}</p>
            <h3>{exercise.lower.name} → {exercise.upper.name} = {INTERVAL_LABELS[exercise.interval]}</h3>
            <p>{path.join(' → ')} establishes the interval number. The exact pitches establish its quality.</p>
            <strong>{exercise.chordConnection}</strong>
            <button className="primary-button" onClick={next}>{question === 10 ? 'Finish session' : 'Next interval'} →</button>
          </div>
        )}
      </section>
    </main>
  )
}
