import type { SpelledPitch } from '../music/types'

const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11]
const BLACK_POSITIONS: Record<number, number> = { 1: 1, 3: 2, 6: 4, 8: 5, 10: 6 }

interface Props {
  root: SpelledPitch
  selected: SpelledPitch[]
  onSelect?: (pitchClass: number) => void
}

export function InteractiveKeyboard({ root, selected, onSelect }: Props) {
  const selectedPcs = new Set(selected.map((pitch) => pitch.pitchClass))
  const classFor = (pc: number) => {
    if (pc === root.pitchClass) return ' root-key'
    if (selectedPcs.has(pc)) return ' selected-key'
    return ''
  }
  return (
    <div className="interactive-piano" aria-label="One-octave piano keyboard">
      <div className="interactive-whites">
        {WHITE_PCS.map((pc) => (
          <button key={pc} aria-label={`Piano pitch ${pc}`} className={classFor(pc)} onClick={() => onSelect?.(pc)}>
            {pc === 0 && <span>C</span>}
          </button>
        ))}
      </div>
      {[1, 3, 6, 8, 10].map((pc) => (
        <button
          key={pc}
          aria-label={`Black-key pitch ${pc}`}
          className={`interactive-black${classFor(pc)}`}
          style={{ left: `${(BLACK_POSITIONS[pc] / 7) * 100}%` }}
          onClick={() => onSelect?.(pc)}
        />
      ))}
    </div>
  )
}

