import type { Exercise } from '../music/types'

type ToneModule = typeof import('tone')
let toneModule: ToneModule | null = null
let synth: import('tone').PolySynth | null = null

async function getSynth(): Promise<{ instrument: import('tone').PolySynth; Tone: ToneModule }> {
  const Tone = toneModule ?? await import('tone')
  toneModule = Tone
  await Tone.start()
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth).toDestination()
    synth.set({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.008, decay: 0.22, sustain: 0.18, release: 0.9 },
      volume: -8,
    })
  }
  synth.releaseAll()
  return { instrument: synth, Tone }
}

function midiToNote(midi: number, Tone: ToneModule): string {
  return Tone.Frequency(midi, 'midi').toNote()
}

export async function playArpeggio(exercise: Exercise): Promise<void> {
  const { instrument, Tone } = await getSynth()
  const start = Tone.now() + 0.05
  exercise.notes.forEach((note, index) => {
    instrument.triggerAttackRelease(midiToNote(note.midi, Tone), 0.22, start + index * 0.25)
  })
}

export async function playBlockChord(exercise: Exercise): Promise<void> {
  const { instrument, Tone } = await getSynth()
  const bass = Math.min(...exercise.notes.map((note) => note.midi))
  const pitchClasses = new Set(exercise.chordTones.map((tone) => tone.pitchClass))
  const notes: number[] = []
  for (let midi = bass; midi < bass + 12 && notes.length < 3; midi += 1) {
    if (pitchClasses.has(midi % 12)) notes.push(midi)
  }
  instrument.triggerAttackRelease(notes.map((note) => midiToNote(note, Tone)), 1.1, Tone.now() + 0.05)
}
