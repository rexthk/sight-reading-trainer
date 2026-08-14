import type { Exercise } from '../music/types'

const WHITE_PCS = new Set([0, 2, 4, 5, 7, 9, 11])

export function PianoKeyboard({ exercise }: { exercise: Exercise }) {
  const usedMidis = new Set(exercise.notes.map((note) => note.midi))
  const minMidi = Math.floor((Math.min(...usedMidis) - 1) / 12) * 12
  const maxMidi = Math.ceil((Math.max(...usedMidis) + 1) / 12) * 12
  const all = Array.from({ length: maxMidi - minMidi + 1 }, (_, index) => minMidi + index)
  const whites = all.filter((midi) => WHITE_PCS.has(midi % 12))
  const blacks = all.filter((midi) => !WHITE_PCS.has(midi % 12))
  const rootPc = exercise.root.pitchClass
  const bassMidi = Math.min(...exercise.notes.map((note) => note.midi))

  const roleClass = (midi: number) => {
    if (!usedMidis.has(midi)) return ''
    if (midi === bassMidi) return ' bass'
    if (midi % 12 === rootPc) return ' root-note'
    return ' chord-note'
  }

  return (
    <div className="piano" aria-label="Piano keyboard showing the answer">
      <div className="white-keys">
        {whites.map((midi) => <div key={midi} className={`white-key${roleClass(midi)}`} />)}
      </div>
      {blacks.map((midi) => {
        const precedingWhites = whites.filter((white) => white < midi).length
        const left = ((precedingWhites - 0.34) / whites.length) * 100
        return <div key={midi} className={`black-key${roleClass(midi)}`} style={{ left: `${left}%` }} />
      })}
    </div>
  )
}

