import { useEffect, useMemo, useRef, useState } from 'react'
import { generateConstructionExercise } from '../music/generator'
import type { ConstructionAttempt, ConstructionExercise, ErrorCause, ProgressData, SpelledPitch } from '../music/types'
import {
  COMMON_ROOT_PITCH_CLASSES,
  INTERVAL_LABELS,
  QUALITY_FORMULAS,
  ROOT_OPTIONS,
  letterDistancePath,
  noteAccidental,
  noteLetter,
  pitchClassFromName,
  qualityLabel,
  spellForLetterAndPitchClass,
  stackedThirdKinds,
} from '../music/theory'
import { InteractiveKeyboard } from './InteractiveKeyboard'
import { PitchStaff } from './PitchStaff'

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const ACCIDENTALS = [
  { label: '♭♭', value: '♭♭' },
  { label: '♭', value: '♭' },
  { label: '♮', value: '' },
  { label: '♯', value: '♯' },
  { label: '♯♯', value: '♯♯' },
]

interface Props {
  progress: ProgressData
  onRecord: (attempt: ConstructionAttempt) => void
  onExit: () => void
}

type Role = 'third' | 'fifth'

function asPitch(name: string): SpelledPitch | null {
  return name ? { name, pitchClass: pitchClassFromName(name) } : null
}

function hintFor(exercise: ConstructionExercise, role: Role, level: number): string {
  const target = role === 'third' ? exercise.chordTones[1] : exercise.chordTones[2]
  const steps = role === 'third' ? 2 : 4
  const path = letterDistancePath(exercise.root.name, steps)
  if (level === 1) return `${qualityLabel(exercise.quality)} triad: ${QUALITY_FORMULAS[exercise.quality].rootIntervals}. Start with the letter name, not semitones.`
  if (level === 2) return `What letter is a ${role === 'third' ? '3rd' : '5th'} above ${exercise.root.name}? Count the starting letter as 1.`
  if (level === 3) return `${path.join(' → ')}. The ${role} must be some kind of ${target.name[0]}.`
  return `${target.name[0]} is the letter. Now choose its accidental so ${exercise.root.name} → ${target.name} has the required interval.`
}

export function BuildChordSession({ progress, onRecord, onExit }: Props) {
  const previousCount = progress.learningAttempts.filter((attempt) => attempt.kind === 'construction').length
  const accidentalErrors = progress.confusions['cause:accidental-error'] ?? 0
  const letterErrors = progress.confusions['cause:letter-distance-error'] ?? 0
  const roots = accidentalErrors > letterErrors
    ? [10, 3, 8, 1, 10, 3, 5]
    : previousCount < 20 ? COMMON_ROOT_PITCH_CLASSES : ROOT_OPTIONS.map((root) => root.pitchClass)
  const baseQualities = previousCount < 8 ? (['major', 'minor'] as const) : (['major', 'minor', 'diminished'] as const)
  const qualityPool = baseQualities.flatMap((quality) => (progress.skills[`construction:${quality}`]?.score ?? 0.4) < 0.7 ? [quality, quality] : [quality])
  const [exercise, setExercise] = useState(() => generateConstructionExercise(roots, qualityPool))
  const [activeRole, setActiveRole] = useState<Role>('third')
  const [third, setThird] = useState('')
  const [fifth, setFifth] = useState('')
  const [hintLevel, setHintLevel] = useState(0)
  const [message, setMessage] = useState('')
  const [correct, setCorrect] = useState(false)
  const [question, setQuestion] = useState(1)
  const [correctCount, setCorrectCount] = useState(0)
  const [finished, setFinished] = useState(false)
  const startedAt = useRef<number | null>(null)

  useEffect(() => { startedAt.current = performance.now() }, [exercise.id])

  const thirdPitch = useMemo(() => asPitch(third), [third])
  const fifthPitch = useMemo(() => asPitch(fifth), [fifth])
  const selectedPitches = [thirdPitch, fifthPitch].filter((pitch): pitch is SpelledPitch => pitch !== null)
  const activeValue = activeRole === 'third' ? third : fifth
  const setActiveValue = (value: string) => {
    if (activeRole === 'third') setThird(value)
    else setFifth(value)
    setMessage('')
  }

  const chooseLetter = (letter: string) => setActiveValue(letter)
  const chooseAccidental = (accidental: string) => {
    if (!activeValue) {
      setMessage('Choose the letter name first. That is the musical shortcut.')
      return
    }
    setActiveValue(`${activeValue[0]}${accidental}`)
  }
  const choosePianoPitch = (pitchClass: number) => {
    if (!activeValue) {
      setMessage('Choose the letter name first, then use the keyboard to find its accidental.')
      return
    }
    const spelling = spellForLetterAndPitchClass(activeValue[0], pitchClass)
    if (!spelling) {
      setMessage(`That piano key cannot be spelled as a nearby ${activeValue[0]}. Try another key.`)
      return
    }
    setActiveValue(spelling)
  }

  const check = () => {
    if (!third || !fifth) return
    const targetThird = exercise.chordTones[1].name
    const targetFifth = exercise.chordTones[2].name
    const thirdCorrect = third === targetThird
    const fifthCorrect = fifth === targetFifth
    const letterNamesCorrect = noteLetter(third) === noteLetter(targetThird) && noteLetter(fifth) === noteLetter(targetFifth)
    const accidentalsCorrect = noteAccidental(third) === noteAccidental(targetThird) && noteAccidental(fifth) === noteAccidental(targetFifth)
    const isCorrect = thirdCorrect && fifthCorrect
    const errorTags: ErrorCause[] = []
    if (!letterNamesCorrect) errorTags.push('letter-distance-error')
    if (letterNamesCorrect && !accidentalsCorrect) errorTags.push('accidental-error')
    if (!thirdCorrect || !fifthCorrect) errorTags.push('interval-error')
    const attempt: ConstructionAttempt = {
      id: crypto.randomUUID(),
      kind: 'construction',
      timestamp: Date.now(),
      root: exercise.root,
      quality: exercise.quality,
      selectedThird: third,
      selectedFifth: fifth,
      correct: isCorrect,
      thirdCorrect,
      fifthCorrect,
      letterNamesCorrect,
      accidentalsCorrect,
      hintsUsed: hintLevel,
      responseMs: Math.max(1, Math.round(performance.now() - (startedAt.current ?? performance.now()))),
      errorTags,
    }
    onRecord(attempt)
    if (isCorrect) {
      setCorrect(true)
      setCorrectCount((count) => count + 1)
      setMessage('You derived it. No chord-by-chord memorisation needed.')
    } else if (!letterNamesCorrect) {
      setMessage('Check the letter distance first. A 3rd and a 5th must use the correct letter names before accidentals matter.')
    } else {
      setMessage('Your letter names are right. Keep them, then adjust the accidental to make the required interval.')
    }
  }

  const next = () => {
    if (question >= 10) { setFinished(true); return }
    setQuestion((value) => value + 1)
    let nextExercise = generateConstructionExercise(roots, qualityPool)
    for (let tries = 0; tries < 5 && nextExercise.root.pitchClass === exercise.root.pitchClass && nextExercise.quality === exercise.quality; tries += 1) {
      nextExercise = generateConstructionExercise(roots, qualityPool)
    }
    setExercise(nextExercise)
    setActiveRole('third')
    setThird('')
    setFifth('')
    setHintLevel(0)
    setMessage('')
    setCorrect(false)
  }

  if (finished) {
    return (
      <main className="page session-complete">
        <div className="completion-mark">△</div>
        <p className="eyebrow">CONSTRUCTION SESSION COMPLETE</p>
        <h1>{correctCount} / 10</h1>
        <p>Every chord you derived strengthens a reusable interval structure—not one isolated spelling.</p>
        <div className="completion-actions"><button className="primary-button" onClick={onExit}>Back home</button></div>
      </main>
    )
  }

  const [lowerThird, upperThird] = stackedThirdKinds(exercise.quality)
  const preview = [exercise.root, ...selectedPitches]

  return (
    <main className="learning-session page">
      <header className="learning-header">
        <button className="icon-button" onClick={onExit} aria-label="Leave session">×</button>
        <div><p className="eyebrow">BUILD THE CHORD · {question}/10</p><h1>{exercise.root.name} {qualityLabel(exercise.quality)}</h1></div>
        <div className="formula-badge">{QUALITY_FORMULAS[exercise.quality].short}</div>
      </header>

      <section className="construction-layout">
        <div className="panel construction-visual">
          <PitchStaff pitches={preview} label={`Chord construction beginning on ${exercise.root.name}`} />
          <InteractiveKeyboard root={exercise.root} selected={selectedPitches} onSelect={correct ? undefined : choosePianoPitch} />
          <p>Choose the letter first. Then use the accidental buttons or piano key.</p>
        </div>

        <div className="panel note-builder">
          <div className="chord-slots">
            <button className="locked"><span>Root</span><strong>{exercise.root.name}</strong></button>
            <button className={activeRole === 'third' ? 'active' : ''} onClick={() => setActiveRole('third')}><span>3rd</span><strong>{third || '?'}</strong></button>
            <button className={activeRole === 'fifth' ? 'active' : ''} onClick={() => setActiveRole('fifth')}><span>5th</span><strong>{fifth || '?'}</strong></button>
          </div>
          {!correct ? (
            <>
              <div className="builder-step"><span>1</span><div><strong>Letter name</strong><p>Count musical letters before thinking about sharps or flats.</p></div></div>
              <div className="choice-row letters">{LETTERS.map((letter) => <button className={activeValue[0] === letter ? 'selected' : ''} key={letter} onClick={() => chooseLetter(letter)}>{letter}</button>)}</div>
              <div className="builder-step"><span>2</span><div><strong>Accidental</strong><p>Now make the interval exact.</p></div></div>
              <div className="choice-row accidentals">{ACCIDENTALS.map((item) => <button className={activeValue && noteAccidental(activeValue) === (item.value || '♮') ? 'selected' : ''} key={item.label} onClick={() => chooseAccidental(item.value)}>{item.label}</button>)}</div>
              {hintLevel > 0 && <div className="progressive-hint"><b>Hint {hintLevel}</b><p>{hintFor(exercise, activeRole, hintLevel)}</p></div>}
              {message && <p className="builder-message">{message}</p>}
              <div className="builder-actions">
                <button className="hint-button" onClick={() => setHintLevel((level) => Math.min(4, level + 1))}>I need a hint</button>
                <button className="primary-button" disabled={!third || !fifth} onClick={check}>Check construction</button>
              </div>
            </>
          ) : (
            <div className="construction-success">
              <p className="eyebrow">DERIVED, NOT MEMORISED</p>
              <h2>{exercise.chordTones.map((tone) => tone.name).join('–')}</h2>
              <div className="derivation-lines">
                <p><b>{exercise.root.name} → {exercise.chordTones[1].name}</b><span>{INTERVAL_LABELS[lowerThird]}</span></p>
                <p><b>{exercise.chordTones[1].name} → {exercise.chordTones[2].name}</b><span>{INTERVAL_LABELS[upperThird]}</span></p>
                <p><b>{QUALITY_FORMULAS[exercise.quality].short}</b><span>= {qualityLabel(exercise.quality)} triad</span></p>
              </div>
              <p className="principle-callout">First determine the letter name. Then determine the accidental.</p>
              <button className="primary-button" onClick={next}>{question === 10 ? 'Finish session' : 'Build the next chord'} →</button>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
