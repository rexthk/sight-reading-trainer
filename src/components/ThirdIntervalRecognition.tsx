import { useEffect, useRef, useState } from 'react'
import { generateThirdIntervalExercise } from '../music/generator'
import type { ProgressData, ThirdIntervalExercise, ThirdIntervalKind, ThirdRecognitionAttempt } from '../music/types'
import { ThirdIntervalKeyboard } from './ThirdIntervalKeyboard'
import { ThirdIntervalStaff, type ThirdStaffMode } from './ThirdIntervalStaff'

interface Props {
  progress: ProgressData
  onRecord: (attempt: ThirdRecognitionAttempt) => void
  onExit: () => void
}

type Feedback = { correct: boolean; responseMs: number; underTarget: boolean; selected: ThirdIntervalKind }

const LABELS: Record<ThirdIntervalKind, string> = {
  'major-third': 'Major 3rd',
  'minor-third': 'Minor 3rd',
}

export function ThirdIntervalRecognition({ progress, onRecord, onExit }: Props) {
  const initialRecent = progress.learningAttempts
    .filter((attempt): attempt is ThirdRecognitionAttempt => attempt.kind === 'third-recognition')
    .slice(-6)
    .map((attempt) => attempt.signature)
  const [exercise, setExercise] = useState(() => generateThirdIntervalExercise(initialRecent))
  const recentRef = useRef(initialRecent)
  const generatedRef = useRef({
    major: exercise.interval === 'major-third' ? 1 : 0,
    minor: exercise.interval === 'minor-third' ? 1 : 0,
  })
  const startedAt = useRef(0)

  const makeExercise = (): ThirdIntervalExercise => {
    const counts = generatedRef.current
    const interval: ThirdIntervalKind = counts.major === counts.minor
      ? (Math.random() < 0.5 ? 'major-third' : 'minor-third')
      : counts.major < counts.minor ? 'major-third' : 'minor-third'
    if (interval === 'major-third') counts.major += 1
    else counts.minor += 1
    return generateThirdIntervalExercise(recentRef.current, interval)
  }

  const [rapid, setRapid] = useState(false)
  const [staffMode, setStaffMode] = useState<ThirdStaffMode>('bass')
  const [showNames, setShowNames] = useState(false)
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [session, setSession] = useState({ answered: 0, correct: 0, totalMs: 0, underTarget: 0 })

  useEffect(() => {
    startedAt.current = performance.now()
  }, [exercise.id])

  const answer = (selected: ThirdIntervalKind) => {
    if (feedback) return
    const now = performance.now()
    const responseMs = Math.max(1, Math.round(now - (startedAt.current || now)))
    const correct = selected === exercise.interval
    const underTarget = correct && responseMs < 1000
    const attempt: ThirdRecognitionAttempt = {
      id: crypto.randomUUID(),
      kind: 'third-recognition',
      timestamp: Date.now(),
      lower: exercise.lower,
      upper: exercise.upper,
      interval: exercise.interval,
      selected,
      correct,
      responseMs,
      rapid,
      underTarget,
      signature: exercise.signature,
      errorTags: correct ? [] : ['interval-error'],
    }
    onRecord(attempt)
    setFeedback({ correct, responseMs, underTarget, selected })
    setSession((current) => ({
      answered: current.answered + 1,
      correct: current.correct + (correct ? 1 : 0),
      totalMs: current.totalMs + responseMs,
      underTarget: current.underTarget + (underTarget ? 1 : 0),
    }))
    recentRef.current = [exercise.signature, ...recentRef.current.filter((item) => item !== exercise.signature)].slice(0, 6)
  }

  const next = () => {
    setExercise(makeExercise())
    setFeedback(null)
  }

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.repeat) return
      if (feedback) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          next()
        }
        return
      }
      if (event.key === 'ArrowLeft') answer('major-third')
      if (event.key === 'ArrowRight') answer('minor-third')
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  const toggleRapid = () => {
    setRapid((current) => !current)
    startedAt.current = performance.now()
  }

  const changeStaff = (mode: ThirdStaffMode) => {
    setStaffMode(mode)
    startedAt.current = performance.now()
  }

  const accuracy = session.answered ? Math.round(session.correct / session.answered * 100) : 0
  const average = session.answered ? session.totalMs / session.answered : 0

  return (
    <main className={`third-recognition-page${rapid ? ' rapid' : ''}`}>
      <header className="third-recognition-header">
        <button className="icon-button" onClick={onExit} aria-label="Leave session">×</button>
        <div>
          <p className="eyebrow">THIRD INTERVAL RECOGNITION</p>
          <h1>{rapid ? 'Under 1 second.' : 'See it. Name it.'}</h1>
        </div>
        <div className="third-controls">
          <label>
            <span className="visually-hidden">Staff view</span>
            <select aria-label="Staff view" value={staffMode} onChange={(event) => changeStaff(event.target.value as ThirdStaffMode)}>
              <option value="bass">Bass clef</option>
              <option value="treble">Treble clef</option>
              <option value="grand">Grand staff</option>
            </select>
          </label>
          <button className={showNames ? 'active' : ''} onClick={() => setShowNames((value) => !value)}>Names {showNames ? 'on' : 'off'}</button>
          <button className={showKeyboard ? 'active' : ''} onClick={() => setShowKeyboard((value) => !value)}>Keyboard {showKeyboard ? 'on' : 'off'}</button>
          <button className={rapid ? 'rapid-active' : ''} onClick={toggleRapid}>⚡ Rapid {rapid ? 'on' : 'off'}</button>
        </div>
      </header>

      <section className={`third-drill-card${feedback ? feedback.correct ? ' flash-correct' : ' flash-wrong' : ''}`}>
        <div className="third-live-stats" aria-label="Session statistics">
          <span><b>{session.answered}</b> answered</span>
          <span><b>{session.answered ? `${accuracy}%` : '—'}</b> accurate</span>
          <span><b>{session.answered ? `${(average / 1000).toFixed(2)}s` : '—'}</b> average</span>
          {rapid && <span><b>{session.underTarget}</b> under 1s</span>}
        </div>

        {showNames && <div className="third-note-names">{exercise.lower.name}<i>→</i>{exercise.upper.name}</div>}
        <ThirdIntervalStaff exercise={exercise} mode={staffMode} />
        {showKeyboard && <ThirdIntervalKeyboard exercise={exercise} showNames={showNames} />}

        <div className="third-answer-buttons">
          {(['major-third', 'minor-third'] as ThirdIntervalKind[]).map((interval) => {
            const selected = feedback?.selected === interval
            const answerClass = feedback
              ? interval === exercise.interval ? 'correct' : selected ? 'wrong' : ''
              : ''
            return <button key={interval} className={answerClass} disabled={Boolean(feedback)} onClick={() => answer(interval)}>{LABELS[interval]}</button>
          })}
        </div>

        <div className={`third-feedback${feedback ? ' visible' : ''}`} aria-live="polite">
          {feedback && (
            <>
              <div>
                <strong>{feedback.correct ? feedback.underTarget || !rapid ? 'Correct' : 'Correct — faster' : 'Wrong'}</strong>
                <span>{exercise.lower.name}–{exercise.upper.name} is a {LABELS[exercise.interval]} · {(feedback.responseMs / 1000).toFixed(2)}s</span>
              </div>
              <button className="third-next-button" onClick={next}>Next →</button>
            </>
          )}
        </div>
        <p className="third-shortcuts"><kbd>←</kbd> Major <kbd>→</kbd> Minor {feedback && <><kbd>↵</kbd> Next</>}</p>
      </section>
    </main>
  )
}
