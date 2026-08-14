import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { generateAdaptiveExercise, makeAttempt } from '../state/progress'
import type {
  Answer,
  AnswerResult,
  Attempt,
  Exercise,
  PracticeConfig,
  ProgressData,
} from '../music/types'
import { INVERSIONS, QUALITIES } from '../music/types'
import {
  chordSymbol,
  inversionLabel,
  qualityLabel,
  ROMAN_NUMERALS,
  ROOT_OPTIONS,
  rootLabelForExercise,
} from '../music/theory'
import { playArpeggio, playBlockChord } from '../audio/player'
import { StaffNotation } from './StaffNotation'
import { PianoKeyboard } from './PianoKeyboard'
import { GuidedRecognition } from './GuidedRecognition'
import { ReasoningFeedback } from './ReasoningFeedback'

const EMPTY_ANSWER: Answer = { root: null, quality: null, inversion: null, romanNumeral: null }

interface Props {
  config: PracticeConfig
  progress: ProgressData
  onRecord: (attempt: Attempt) => void
  onExit: () => void
}

function answerIsComplete(answer: Answer, exercise: Exercise): boolean {
  return answer.root !== null
    && answer.quality !== null
    && answer.inversion !== null
    && (exercise.mode !== 'in-key' || answer.romanNumeral !== null)
}

export function PracticeSession({ config, progress, onRecord, onExit }: Props) {
  const [exercise, setExercise] = useState(() => generateAdaptiveExercise(config, progress))
  const [answer, setAnswer] = useState<Answer>(EMPTY_ANSWER)
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [correctCount, setCorrectCount] = useState(0)
  const [finished, setFinished] = useState(false)
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [remainingMs, setRemainingMs] = useState(config.timer * 1000)
  const [notationReady, setNotationReady] = useState(false)
  const [guided, setGuided] = useState(false)
  const [assisted, setAssisted] = useState(false)
  const [instantHidden, setInstantHidden] = useState(false)
  const startedAt = useRef<number | null>(null)

  const rootChoices = useMemo(() => ROOT_OPTIONS.map((root) => ({
    pitchClass: root.pitchClass,
    name: rootLabelForExercise(root.pitchClass, exercise.key),
  })), [exercise.key])

  const submit = useCallback((timedOut = false, overrideAnswer?: Answer, isAssisted = false, errorTags: Parameters<typeof makeAttempt>[5] = []) => {
    if (result) return
    const answerToUse = overrideAnswer ?? answer
    const responseMs = Math.max(1, Math.round(performance.now() - (startedAt.current ?? performance.now())))
    const attempt = makeAttempt(exercise, answerToUse, responseMs, timedOut, isAssisted, errorTags)
    setAnswer(answerToUse)
    setResult(attempt.result)
    setAssisted(isAssisted)
    setGuided(false)
    if (attempt.result.allCorrect) setCorrectCount((count) => count + 1)
    onRecord(attempt)
  }, [answer, exercise, onRecord, result])

  const handleNotationReady = useCallback(() => {
    if (startedAt.current === null) {
      startedAt.current = performance.now()
      setRemainingMs(config.timer * 1000)
      setNotationReady(true)
    }
  }, [config.timer])

  useEffect(() => {
    if (!config.timer || !notationReady || result || finished) return
    const timer = window.setInterval(() => {
      const remaining = config.timer * 1000 - (performance.now() - (startedAt.current ?? performance.now()))
      setRemainingMs(Math.max(0, remaining))
      if (remaining <= 0) {
        window.clearInterval(timer)
        submit(true)
      }
    }, 80)
    return () => window.clearInterval(timer)
  }, [config.timer, exercise.id, finished, notationReady, result, submit])

  useEffect(() => {
    if (config.style !== 'instant' || !notationReady || result) return
    const timeout = window.setTimeout(() => setInstantHidden(true), 1800)
    return () => window.clearTimeout(timeout)
  }, [config.style, exercise.id, notationReady, result])

  const next = () => {
    if (questionNumber >= 10) {
      setFinished(true)
      return
    }
    setQuestionNumber((number) => number + 1)
    setExercise(generateAdaptiveExercise(config, progress))
    setAnswer(EMPTY_ANSWER)
    setResult(null)
    setShowKeyboard(false)
    setGuided(false)
    setAssisted(false)
    setInstantHidden(false)
    setNotationReady(false)
    setRemainingMs(config.timer * 1000)
    startedAt.current = null
  }

  if (finished) {
    const percentage = correctCount * 10
    return (
      <main className="page session-complete">
        <div className="completion-mark">{correctCount >= 8 ? '♪' : '↻'}</div>
        <p className="eyebrow">SESSION COMPLETE</p>
        <h1>{correctCount} / 10</h1>
        <p>{percentage >= 80 ? 'The shapes are starting to read as harmony.' : 'Useful mistakes. Quick Practice will bring these shapes back in new forms.'}</p>
        <div className="completion-actions">
          <button className="primary-button" onClick={onExit}>Back home</button>
          <button className="secondary-button" onClick={() => {
            setQuestionNumber(1)
            setCorrectCount(0)
            setFinished(false)
            setExercise(generateAdaptiveExercise(config, progress))
            setAnswer(EMPTY_ANSWER)
            setResult(null)
            setGuided(false)
            setAssisted(false)
            setInstantHidden(false)
            setNotationReady(false)
            startedAt.current = null
          }}>Another 10</button>
        </div>
      </main>
    )
  }

  const submitted = result !== null
  const timerPercent = config.timer ? (remainingMs / (config.timer * 1000)) * 100 : 100

  return (
    <main className="practice-page">
      <header className="practice-header">
        <button className="icon-button" onClick={onExit} aria-label="Leave session">×</button>
        <div className="question-count">{questionNumber}<span>/10</span></div>
        <div className={`timer-readout ${remainingMs < 3000 && config.timer ? 'urgent' : ''}`}>
          {config.timer ? `${Math.ceil(remainingMs / 1000)}s` : '∞'}
        </div>
      </header>
      <div className="timer-track"><div style={{ width: `${timerPercent}%` }} /></div>

      <section className="notation-card">
        <div className="notation-meta">
          <span>{exercise.key ? `KEY: ${exercise.key.name} MAJOR` : 'BASS CLEF · ONE HARMONY'}</span>
          <span>{exercise.presentation === 'arpeggio' ? exercise.pattern.replace('octave', 'octave-displaced') : exercise.presentation.replace('-', ' ')}</span>
        </div>
        {instantHidden && !submitted
          ? <div className="flash-hidden"><span>◌</span><p>Hold the shape in mind.</p></div>
          : <StaffNotation exercise={exercise} reveal={submitted && (result?.allCorrect === true || config.style === 'instant' || assisted)} onReady={handleNotationReady} />}
        {!submitted && !guided && <p className="notation-prompt">{exercise.presentation === 'arpeggio' ? 'What harmony does this bar outline?' : 'What chord is shown?'}</p>}
      </section>

      {guided ? (
        <GuidedRecognition exercise={exercise} onComplete={(guidedAnswer, errors) => submit(false, guidedAnswer, true, errors)} />
      ) : !submitted ? (
        <section className="answer-sheet">
          <fieldset className="answer-group">
            <legend><span>1</span> Root</legend>
            <div className="answer-grid roots">
              {rootChoices.map((choice) => (
                <button key={choice.pitchClass} className={answer.root === choice.pitchClass ? 'selected' : ''} onClick={() => setAnswer({ ...answer, root: choice.pitchClass })}>{choice.name}</button>
              ))}
            </div>
          </fieldset>
          <fieldset className="answer-group">
            <legend><span>2</span> Quality</legend>
            <div className="answer-grid thirds">
              {QUALITIES.map((quality) => (
                <button key={quality} className={answer.quality === quality ? 'selected' : ''} onClick={() => setAnswer({ ...answer, quality })}>{qualityLabel(quality)}</button>
              ))}
            </div>
          </fieldset>
          <fieldset className="answer-group">
            <legend><span>3</span> Bass / inversion</legend>
            <div className="answer-grid thirds">
              {INVERSIONS.map((inversion) => (
                <button key={inversion} className={answer.inversion === inversion ? 'selected' : ''} onClick={() => setAnswer({ ...answer, inversion })}>{inversionLabel(inversion)}</button>
              ))}
            </div>
          </fieldset>
          {exercise.mode === 'in-key' && (
            <fieldset className="answer-group">
              <legend><span>4</span> Function</legend>
              <div className="answer-grid roman-grid">
                {ROMAN_NUMERALS.map((roman) => (
                  <button key={roman} className={answer.romanNumeral === roman ? 'selected' : ''} onClick={() => setAnswer({ ...answer, romanNumeral: roman })}>{roman}</button>
                ))}
              </div>
            </fieldset>
          )}
          <button className="primary-button submit-answer" disabled={!answerIsComplete(answer, exercise)} onClick={() => submit(false)}>Check answer</button>
          {config.style === 'learning' && <button className="dont-know-button" onClick={() => setGuided(true)}>I don’t know this chord</button>}
        </section>
      ) : config.style === 'learning' && !result.allCorrect && !assisted ? (
        <section className="panel retry-panel">
          <p className="eyebrow">NOT YET — KEEP THE ANSWER HIDDEN</p>
          <h2>Would you like another look?</h2>
          <p>The chord has not been revealed. Try the same shape again, or reason through pitch classes, stacked 3rds, root, and bass.</p>
          <div><button className="secondary-button" onClick={() => { setResult(null); setAnswer(EMPTY_ANSWER) }}>Try again</button><button className="primary-button" onClick={() => { setResult(null); setAnswer(EMPTY_ANSWER); setGuided(true) }}>Reason it out step by step</button></div>
        </section>
      ) : (
        <section className={`feedback-card ${result.allCorrect ? 'success' : 'needs-work'}`}>
          <div className="feedback-heading">
            <div>
              <p className="eyebrow">{assisted ? 'REASONED THROUGH' : result.allCorrect ? 'RECOGNISED' : 'LOOK AGAIN'}</p>
              <h2>{chordSymbol(exercise.root, exercise.quality)}</h2>
            </div>
            {exercise.romanNumeral && <div className="roman-answer">{exercise.romanNumeral}</div>}
          </div>

          <div className="answer-review">
            <span className={result.root ? 'correct' : 'wrong'}>
              Root: {result.root ? exercise.root.name : `${answer.root === null ? 'No answer' : rootLabelForExercise(answer.root, exercise.key)} → ${exercise.root.name}`}
            </span>
            <span className={result.quality ? 'correct' : 'wrong'}>
              {result.quality ? qualityLabel(exercise.quality) : `${answer.quality === null ? 'No answer' : qualityLabel(answer.quality)} → ${qualityLabel(exercise.quality)}`}
            </span>
            <span className={result.inversion ? 'correct' : 'wrong'}>
              {result.inversion ? inversionLabel(exercise.inversion) : `${answer.inversion === null ? 'No answer' : inversionLabel(answer.inversion)} → ${inversionLabel(exercise.inversion)}`}
            </span>
            {result.romanNumeral === false && <span className="wrong">{answer.romanNumeral ?? 'No answer'} → {exercise.romanNumeral}</span>}
          </div>
          <ReasoningFeedback exercise={exercise} />
          <div className="legend">
            <span><i className="bass-dot" /> Lowest pitch</span>
            <span><i className="root-dot" /> Root</span>
            <span><i className="chord-dot" /> Chord tone</span>
          </div>
          {showKeyboard && <PianoKeyboard exercise={exercise} />}
          <div className="feedback-tools">
            <button onClick={() => void playArpeggio(exercise)}>▶ Arpeggio</button>
            <button onClick={() => void playBlockChord(exercise)}>▶ Block chord</button>
            <button onClick={() => setShowKeyboard((show) => !show)}>{showKeyboard ? 'Hide' : 'Show'} keyboard</button>
          </div>
          <button className="primary-button next-button" onClick={next}>{questionNumber === 10 ? 'Finish session' : 'Next shape'} <span>→</span></button>
        </section>
      )}
    </main>
  )
}
