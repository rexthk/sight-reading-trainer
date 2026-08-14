import { useEffect, useRef } from 'react'
import type { SpelledPitch } from '../music/types'
import { toVexPitchName } from '../music/theory'

interface Props {
  pitches: SpelledPitch[]
  mode?: 'stacked' | 'sequential'
  label: string
}

export function PitchStaff({ pitches, mode = 'stacked', label }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = ref.current
    if (!container || pitches.length === 0) return
    let disposed = false
    const draw = async () => {
      const { Accidental, Formatter, Renderer, Stave, StaveNote, Voice } = await import('vexflow')
      if (disposed) return
      container.replaceChildren()
      const width = Math.max(280, Math.min(container.clientWidth, 560))
      const renderer = new Renderer(container, Renderer.Backends.SVG)
      renderer.resize(width, 170)
      const context = renderer.getContext()
      const stave = new Stave(8, 30, width - 16).addClef('bass')
      stave.setContext(context).draw()
      const rootMidi = 48 + pitches[0].pitchClass
      const keys = pitches.map((pitch, index) => {
        const distance = index === 0 ? 0 : (pitch.pitchClass - pitches[0].pitchClass + 12) % 12
        const midi = rootMidi + distance
        return `${toVexPitchName(pitch.name)}/${Math.floor(midi / 12) - 1}`
      })
      const notes = mode === 'stacked'
        ? [new StaveNote({ clef: 'bass', keys, duration: 'w' })]
        : keys.map((key) => new StaveNote({ clef: 'bass', keys: [key], duration: 'h' }))
      const voice = new Voice({ numBeats: 4, beatValue: 4 }).addTickables(notes)
      Accidental.applyAccidentals([voice], 'C')
      new Formatter().joinVoices([voice]).format([voice], width - 100)
      voice.draw(context, stave)
      const svg = container.querySelector('svg')
      if (svg) {
        svg.setAttribute('role', 'img')
        svg.setAttribute('aria-label', label)
      }
    }
    void draw()
    const observer = new ResizeObserver(() => void draw())
    observer.observe(container)
    return () => { disposed = true; observer.disconnect() }
  }, [label, mode, pitches])

  return <div className="pitch-staff" ref={ref} />
}

