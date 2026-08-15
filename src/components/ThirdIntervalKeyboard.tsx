import type { ThirdIntervalExercise } from '../music/types'

const WHITE_MIDIS = [48, 50, 52, 53, 55, 57, 59, 60, 62, 64]
const BLACK_KEYS = [
  { midi: 49, boundary: 1 },
  { midi: 51, boundary: 2 },
  { midi: 54, boundary: 4 },
  { midi: 56, boundary: 5 },
  { midi: 58, boundary: 6 },
  { midi: 61, boundary: 8 },
  { midi: 63, boundary: 9 },
]

export function ThirdIntervalKeyboard({ exercise, showNames }: { exercise: ThirdIntervalExercise; showNames: boolean }) {
  const lowerMidi = 48 + exercise.lower.pitchClass
  const upperMidi = lowerMidi + exercise.semitones
  const highlighted = new Map([
    [lowerMidi, { name: exercise.lower.name, role: 'lower' }],
    [upperMidi, { name: exercise.upper.name, role: 'upper' }],
  ])

  return (
    <div
      className="third-piano"
      role="img"
      aria-label={`${exercise.lower.name} to ${exercise.upper.name} on a piano keyboard`}
    >
      <div className="third-piano-whites">
        {WHITE_MIDIS.map((midi) => (
          <div key={midi} className={highlighted.get(midi)?.role ?? ''}>
            {showNames && highlighted.has(midi) && <span>{highlighted.get(midi)?.name}</span>}
          </div>
        ))}
      </div>
      {BLACK_KEYS.map(({ midi, boundary }) => (
        <div
          key={midi}
          className={`third-piano-black ${highlighted.get(midi)?.role ?? ''}`}
          style={{ left: `${boundary * 10}%` }}
        >
          {showNames && highlighted.has(midi) && <span>{highlighted.get(midi)?.name}</span>}
        </div>
      ))}
    </div>
  )
}
