import { useEffect, useRef } from 'react'
import type { Exercise } from '../music/types'

interface Props {
  exercise: Exercise
  reveal?: boolean
  onReady?: () => void
}

export function StaffNotation({ exercise, reveal = false, onReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let disposed = false

    const draw = async () => {
      const { Accidental, Beam, Formatter, Renderer, Stave, StaveNote, Voice } = await import('vexflow')
      if (disposed) return
      container.replaceChildren()
      const width = Math.max(320, Math.min(container.clientWidth, 820))
      const renderer = new Renderer(container, Renderer.Backends.SVG)
      renderer.resize(width, 205)
      const context = renderer.getContext()
      const stave = new Stave(12, 42, width - 24)
      stave.addClef('bass').addTimeSignature('4/4')
      if (exercise.key) stave.addKeySignature(exercise.key.vexKey)
      stave.setContext(context).draw()

      const lowestMidi = Math.min(...exercise.notes.map((note) => note.midi))
      const noteColor = (exerciseNote: Exercise['notes'][number]) => {
        const isBass = exerciseNote.midi === lowestMidi
        const isRoot = exerciseNote.toneIndex === 0
        return isBass ? '#b47a18' : isRoot ? '#d25b43' : '#276c68'
      }
      const notes = exercise.presentation === 'arpeggio' ? exercise.notes.map((exerciseNote) => {
        const note = new StaveNote({
          clef: 'bass',
          keys: [exerciseNote.vexKey],
          duration: '8',
          autoStem: true,
        })
        if (reveal) {
          const color = noteColor(exerciseNote)
          note.setStyle({ fillStyle: color, strokeStyle: color })
        }
        return note
      }) : [new StaveNote({
        clef: 'bass',
        keys: exercise.notes.map((note) => note.vexKey),
        duration: 'w',
        autoStem: true,
      })]

      if (reveal && exercise.presentation !== 'arpeggio') {
        exercise.notes.forEach((exerciseNote, index) => {
          const color = noteColor(exerciseNote)
          notes[0].setKeyStyle(index, { fillStyle: color, strokeStyle: color })
        })
      }

      const voice = new Voice({ numBeats: 4, beatValue: 4 }).addTickables(notes)
      Accidental.applyAccidentals([voice], exercise.key?.vexKey ?? 'C')
      new Formatter().joinVoices([voice]).format([voice], width - 150)
      voice.draw(context, stave)
      if (exercise.presentation === 'arpeggio') {
        Beam.generateBeams(notes).forEach((beam) => beam.setContext(context).draw())
      }
      const svg = container.querySelector('svg')
      if (svg) {
        svg.setAttribute('role', 'img')
        svg.setAttribute('aria-label', reveal ? 'Answered arpeggio with harmonic roles highlighted' : 'Bass-clef arpeggio exercise')
      }
      onReady?.()
    }

    void draw()
    const observer = new ResizeObserver(() => void draw())
    observer.observe(container)
    return () => {
      disposed = true
      observer.disconnect()
    }
  }, [exercise, onReady, reveal])

  return <div className="staff" ref={containerRef} />
}
