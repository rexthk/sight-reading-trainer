import { useEffect, useRef } from 'react'
import type { ThirdIntervalExercise } from '../music/types'
import { toVexPitchName } from '../music/theory'

export type ThirdStaffMode = 'bass' | 'treble' | 'grand'

function midiForPitchClass(pitchClass: number, clef: 'bass' | 'treble'): number {
  if (clef === 'treble') return 60 + pitchClass
  return 41 + ((pitchClass - 5 + 12) % 12)
}

export function ThirdIntervalStaff({ exercise, mode }: { exercise: ThirdIntervalExercise; mode: ThirdStaffMode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = ref.current
    if (!container) return
    let disposed = false

    const draw = async () => {
      const { Accidental, Formatter, Renderer, Stave, StaveConnector, StaveNote, Voice } = await import('vexflow')
      if (disposed) return
      container.replaceChildren()
      const width = Math.max(300, Math.min(container.clientWidth, 760))
      const isGrand = mode === 'grand'
      const height = isGrand ? 285 : 205
      const renderer = new Renderer(container, Renderer.Backends.SVG)
      renderer.resize(width, height)
      const context = renderer.getContext()

      let activeClef: 'bass' | 'treble' = mode === 'grand'
        ? ((exercise.lower.pitchClass + exercise.semitones) % 2 === 0 ? 'treble' : 'bass')
        : mode
      let activeStave

      if (isGrand) {
        const treble = new Stave(20, 12, width - 40).addClef('treble')
        const bass = new Stave(20, 122, width - 40).addClef('bass')
        treble.setContext(context).draw()
        bass.setContext(context).draw()
        new StaveConnector(treble, bass).setType('brace').setContext(context).draw()
        new StaveConnector(treble, bass).setType('singleLeft').setContext(context).draw()
        activeStave = activeClef === 'treble' ? treble : bass
      } else {
        activeClef = mode
        activeStave = new Stave(20, 35, width - 40).addClef(activeClef)
        activeStave.setContext(context).draw()
      }

      const lowerMidi = midiForPitchClass(exercise.lower.pitchClass, activeClef)
      const upperMidi = lowerMidi + exercise.semitones
      const keys = [
        `${toVexPitchName(exercise.lower.name)}/${Math.floor(lowerMidi / 12) - 1}`,
        `${toVexPitchName(exercise.upper.name)}/${Math.floor(upperMidi / 12) - 1}`,
      ]
      const note = new StaveNote({ clef: activeClef, keys, duration: 'w' })
      const voice = new Voice({ numBeats: 4, beatValue: 4 }).addTickable(note)
      Accidental.applyAccidentals([voice], 'C')
      new Formatter().joinVoices([voice]).format([voice], width - 150)
      voice.draw(context, activeStave)

      const svg = container.querySelector('svg')
      if (svg) {
        const viewLabel = isGrand ? `Grand staff, notes in ${activeClef} clef` : `${activeClef} clef`
        svg.setAttribute('role', 'img')
        svg.setAttribute('aria-label', `${viewLabel}: ${exercise.lower.name} to ${exercise.upper.name}`)
      }
    }

    void draw()
    const observer = new ResizeObserver(() => void draw())
    observer.observe(container)
    return () => {
      disposed = true
      observer.disconnect()
    }
  }, [exercise, mode])

  return <div className={`third-staff ${mode === 'grand' ? 'grand' : ''}`} ref={ref} />
}
