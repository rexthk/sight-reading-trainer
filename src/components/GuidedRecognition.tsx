import { useMemo, useState } from 'react'
import type { Answer, ErrorCause, Exercise, SpelledPitch } from '../music/types'
import { QUALITIES } from '../music/types'
import {
  QUALITY_FORMULAS,
  classifySimpleInterval,
  qualityLabel,
} from '../music/theory'

interface Props {
  exercise: Exercise
  onComplete: (answer: Answer, errors: ErrorCause[]) => void
}

function distinctPitches(exercise: Exercise): SpelledPitch[] {
  const seen = new Set<number>()
  return exercise.notes.filter((note) => {
    if (seen.has(note.pitchClass)) return false
    seen.add(note.pitchClass)
    return true
  }).map(({ name, pitchClass }) => ({ name, pitchClass }))
}

export function GuidedRecognition({ exercise, onComplete }: Props) {
  const pitches = useMemo(() => distinctPitches(exercise), [exercise])
  const [step, setStep] = useState(0)
  const [candidate, setCandidate] = useState<SpelledPitch | null>(null)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<ErrorCause[]>(['root-unknown'])
  const [quality, setQuality] = useState<string | null>(null)
  const [bassRole, setBassRole] = useState<number | null>(null)

  const ordered = candidate
    ? [...pitches].sort((a, b) => ((a.pitchClass - candidate.pitchClass + 12) % 12) - ((b.pitchClass - candidate.pitchClass + 12) % 12))
    : pitches
  const actualBass = exercise.notes.reduce((lowest, note) => note.midi < lowest.midi ? note : lowest)
  const actualBassRole = exercise.chordTones.findIndex((tone) => tone.pitchClass === actualBass.pitchClass)

  const tryRoot = () => {
    if (!candidate) return
    if (candidate.pitchClass !== exercise.root.pitchClass) {
      setMessage(`${ordered.map((note) => note.name).join('–')} does not make two stacked 3rds. Try another note first.`)
      return
    }
    setMessage('Yes. This order creates two stacked 3rds.')
    setStep(2)
  }

  const tryQuality = () => {
    if (!quality) return
    if (quality !== exercise.quality) {
      setErrors((items) => [...new Set<ErrorCause>([...items, 'quality-unknown'])])
      setMessage(`Check the order of the two 3rds. ${QUALITY_FORMULAS[exercise.quality].short} has one specific quality.`)
      return
    }
    setMessage('The stacked-third formula identifies the quality.')
    setStep(3)
  }

  const tryBass = () => {
    if (bassRole === null) return
    if (bassRole !== actualBassRole) {
      setErrors((items) => [...new Set<ErrorCause>([...items, 'inversion-unknown', 'bass-root-confusion'])])
      setMessage(`The bass is the lowest sounding pitch: ${actualBass.name}. Find its role inside the reordered chord.`)
      return
    }
    onComplete({
      root: exercise.root.pitchClass,
      quality: exercise.quality,
      inversion: exercise.inversion,
      romanNumeral: exercise.romanNumeral ?? null,
    }, errors)
  }

  return (
    <section className="panel guided-flow">
      <div className="guided-progress">{[0, 1, 2, 3].map((number) => <i key={number} className={step >= number ? 'active' : ''} />)}</div>
      {step === 0 && (
        <div className="guided-step">
          <p className="eyebrow">STEP 1 · INVENTORY</p>
          <h2>What pitch classes are present?</h2>
          <div className="pitch-token-row">{pitches.map((pitch) => <span key={pitch.pitchClass}>{pitch.name}</span>)}</div>
          <p>Ignore octave and note order for a moment. Keep only the three pitch names.</p>
          <button className="primary-button" onClick={() => setStep(1)}>Try to stack them in 3rds →</button>
        </div>
      )}
      {step === 1 && (
        <div className="guided-step">
          <p className="eyebrow">STEP 2 · TEST A ROOT</p>
          <h2>Which note can go first?</h2>
          <p>Choose a root candidate. The app will place the other notes above it and test the intervals.</p>
          <div className="pitch-token-row selectable">{pitches.map((pitch) => <button className={candidate?.pitchClass === pitch.pitchClass ? 'selected' : ''} key={pitch.pitchClass} onClick={() => { setCandidate(pitch); setMessage('') }}>{pitch.name}</button>)}</div>
          {candidate && (
            <div className="root-test">
              <strong>{ordered.map((note) => note.name).join(' → ')}</strong>
              <span>{classifySimpleInterval(ordered[0], ordered[1])} · {classifySimpleInterval(ordered[1], ordered[2])}</span>
            </div>
          )}
          {message && <p className="builder-message">{message}</p>}
          <button className="primary-button" disabled={!candidate} onClick={tryRoot}>Test this order</button>
        </div>
      )}
      {step === 2 && (
        <div className="guided-step">
          <p className="eyebrow">STEP 3 · READ THE STRUCTURE</p>
          <h2>{exercise.chordTones.map((tone) => tone.name).join('–')}</h2>
          <div className="interval-stack">
            <span>{exercise.chordTones[0].name} → {exercise.chordTones[1].name}<b>{classifySimpleInterval(exercise.chordTones[0], exercise.chordTones[1])}</b></span>
            <span>{exercise.chordTones[1].name} → {exercise.chordTones[2].name}<b>{classifySimpleInterval(exercise.chordTones[1], exercise.chordTones[2])}</b></span>
          </div>
          <p>What triad quality does that stacked-third pattern create?</p>
          <div className="guided-options">{QUALITIES.map((item) => <button className={quality === item ? 'selected' : ''} key={item} onClick={() => { setQuality(item); setMessage('') }}>{qualityLabel(item)}</button>)}</div>
          {message && <p className="builder-message">{message}</p>}
          <button className="primary-button" disabled={!quality} onClick={tryQuality}>Check the quality</button>
        </div>
      )}
      {step === 3 && (
        <div className="guided-step">
          <p className="eyebrow">STEP 4 · ROOT IS NOT BASS</p>
          <h2>The lowest sounding note is {actualBass.name}.</h2>
          <p>Inside {exercise.chordTones.map((tone) => tone.name).join('–')}, what role does {actualBass.name} play?</p>
          <div className="guided-options">{['Root', '3rd', '5th'].map((label, index) => <button className={bassRole === index ? 'selected' : ''} key={label} onClick={() => { setBassRole(index); setMessage('') }}>{label}</button>)}</div>
          {message && <p className="builder-message">{message}</p>}
          <p className="bass-consequence">Root → root position · 3rd → first inversion · 5th → second inversion</p>
          <button className="primary-button" disabled={bassRole === null} onClick={tryBass}>Check bass and inversion</button>
        </div>
      )}
    </section>
  )
}
