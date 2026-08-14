import { useState } from 'react'
import type { Exercise } from '../music/types'
import {
  QUALITY_FORMULAS,
  classifySimpleInterval,
  inversionLabel,
  qualityLabel,
} from '../music/theory'

export function ReasoningFeedback({ exercise }: { exercise: Exercise }) {
  const [visible, setVisible] = useState(1)
  const original = [...new Map(exercise.notes.map((note) => [note.pitchClass, note.name])).values()].join('–')
  const stacked = exercise.chordTones.map((tone) => tone.name).join('–')
  const bass = exercise.notes.reduce((lowest, note) => note.midi < lowest.midi ? note : lowest)
  const steps = [
    <p key="reorder"><b>Reorder into 3rds</b><span>You saw {original}. Test possible roots until it becomes {stacked}.</span></p>,
    <p key="intervals"><b>Read the two 3rds</b><span>{exercise.chordTones[0].name}→{exercise.chordTones[1].name} = {classifySimpleInterval(exercise.chordTones[0], exercise.chordTones[1])}; {exercise.chordTones[1].name}→{exercise.chordTones[2].name} = {classifySimpleInterval(exercise.chordTones[1], exercise.chordTones[2])}.</span></p>,
    <p key="quality"><b>Name the structure</b><span>{QUALITY_FORMULAS[exercise.quality].short} = {qualityLabel(exercise.quality)} triad. Therefore the root is {exercise.root.name}.</span></p>,
    <p key="bass"><b>Return to the bass</b><span>{bass.name} is the lowest pitch. It is the {['root', '3rd', '5th'][exercise.inversion]}, so this is {inversionLabel(exercise.inversion).toLowerCase()}.</span></p>,
  ]
  return (
    <div className="reasoning-feedback">
      <h3>How to derive it</h3>
      <div className="reasoning-steps">{steps.slice(0, visible).map((step, index) => <div key={index}><i>{index + 1}</i>{step}</div>)}</div>
      {visible < steps.length && <button className="reasoning-next" onClick={() => setVisible((count) => count + 1)}>Reveal next reasoning step ↓</button>}
    </div>
  )
}

