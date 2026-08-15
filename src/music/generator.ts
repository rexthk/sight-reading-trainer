import {
  INVERSIONS,
  PATTERNS,
  QUALITIES,
  type ChordQuality,
  type ConstructionExercise,
  type Exercise,
  type ExerciseNote,
  type Inversion,
  type IntervalExercise,
  type IntervalKind,
  type PatternName,
  type PracticeConfig,
  type SpelledPitch,
  type ThirdIntervalExercise,
  type ThirdIntervalKind,
} from './types'
import {
  buildChord,
  COMMON_ROOT_PITCH_CLASSES,
  intervalAbove,
  keyById,
  MAJOR_KEYS,
  MAJOR_QUALITIES,
  ROMAN_NUMERALS,
  ROOT_OPTIONS,
  toVexPitchName,
} from './theory'

export type RandomSource = () => number

const PATTERN_INDICES: Record<PatternName, number[]> = {
  ascending: [0, 1, 2, 3, 4, 2, 3, 4],
  descending: [4, 3, 2, 1, 0, 2, 1, 0],
  alternating: [0, 2, 1, 3, 2, 1, 0, 1],
  alberti: [0, 2, 1, 2, 0, 2, 1, 2],
  octave: [0, 3, 1, 4, 2, 3, 1, 0],
}

export const BEGINNER_CONFIG: PracticeConfig = {
  mode: 'absolute',
  roots: [0, 5, 7],
  qualities: ['major', 'minor'],
  inversions: [0],
  patterns: ['ascending', 'descending'],
  keys: ['C', 'G', 'F'],
  timer: 0,
  style: 'learning',
  phase: 'root-position',
}

export const INTERMEDIATE_CONFIG: PracticeConfig = {
  mode: 'absolute',
  roots: ROOT_OPTIONS.map((root) => root.pitchClass),
  qualities: ['major', 'minor'],
  inversions: [...INVERSIONS],
  patterns: [...PATTERNS],
  keys: MAJOR_KEYS.map((key) => key.id),
  timer: 10,
  style: 'learning',
  phase: 'inversion',
}

export const ADVANCED_CONFIG: PracticeConfig = {
  mode: 'in-key',
  roots: ROOT_OPTIONS.map((root) => root.pitchClass),
  qualities: [...QUALITIES],
  inversions: [...INVERSIONS],
  patterns: [...PATTERNS],
  keys: MAJOR_KEYS.map((key) => key.id),
  timer: 5,
  style: 'instant',
  phase: 'arpeggio',
}

function choose<T>(items: T[], random: RandomSource): T {
  return items[Math.floor(random() * items.length)] ?? items[0]
}

function chordToneForMidi(midi: number, tones: SpelledPitch[]): { pitch: SpelledPitch; toneIndex: 0 | 1 | 2 } {
  const pitchClass = midi % 12
  const toneIndex = tones.findIndex((tone) => tone.pitchClass === pitchClass) as 0 | 1 | 2
  return { pitch: tones[toneIndex], toneIndex }
}

function makeVoicing(tones: SpelledPitch[], inversion: Inversion, random: RandomSource): number[] {
  const bassPitchClass = tones[inversion].pitchClass
  const pitchClasses = new Set(tones.map((tone) => tone.pitchClass))
  const buildLadder = (bass: number) => {
    const ladder: number[] = []
    for (let midi = bass; midi <= 72 && ladder.length < 5; midi += 1) {
      if (pitchClasses.has(midi % 12)) ladder.push(midi)
    }
    return ladder
  }
  const candidates = Array.from({ length: 20 }, (_, index) => 36 + index)
    .filter((midi) => midi % 12 === bassPitchClass)
    .filter((midi) => buildLadder(midi).length === 5)
  return buildLadder(choose(candidates, random))
}

function noteFromMidi(midi: number, tones: SpelledPitch[]): ExerciseNote {
  const { pitch, toneIndex } = chordToneForMidi(midi, tones)
  const octave = Math.floor(midi / 12) - 1
  return {
    ...pitch,
    midi,
    octave,
    vexKey: `${toVexPitchName(pitch.name)}/${octave}`,
    toneIndex,
  }
}

export function generateExercise(config: PracticeConfig, random: RandomSource = Math.random): Exercise {
  const qualities = config.qualities.length ? config.qualities : QUALITIES
  const inversions = config.inversions.length ? config.inversions : INVERSIONS
  const patterns = config.patterns.length ? config.patterns : PATTERNS
  const inversion = config.phase === 'root-position' ? 0 : choose(inversions, random)
  const pattern = choose(patterns, random)

  let root: SpelledPitch
  let quality: ChordQuality
  let key
  let scaleDegree: number | undefined

  if (config.mode === 'in-key') {
    const keyIds = config.keys.length ? config.keys : MAJOR_KEYS.map((item) => item.id)
    key = keyById(choose(keyIds, random))
    const allowedDegrees = MAJOR_QUALITIES
      .map((degreeQuality, index) => ({ degreeQuality, index }))
      .filter(({ degreeQuality }) => qualities.includes(degreeQuality))
    const chosenDegree = choose(
      allowedDegrees.length ? allowedDegrees : MAJOR_QUALITIES.map((degreeQuality, index) => ({ degreeQuality, index })),
      random,
    )
    quality = chosenDegree.degreeQuality
    scaleDegree = chosenDegree.index
    root = key.scale[scaleDegree]
  } else {
    const roots = config.roots.length ? config.roots : ROOT_OPTIONS.map((item) => item.pitchClass)
    const pitchClass = choose(roots, random)
    root = ROOT_OPTIONS.find((item) => item.pitchClass === pitchClass) ?? ROOT_OPTIONS[0]
    quality = choose(qualities, random)
  }

  const chordTones = buildChord(root, quality)
  const ladder = makeVoicing(chordTones, inversion, random)
  const noteIndices = config.phase === 'arpeggio'
    ? PATTERN_INDICES[pattern]
    : config.phase === 'spread' ? [0, 2, 4] : [0, 1, 2]
  const notes = noteIndices.map((index) => noteFromMidi(ladder[index], chordTones))
  const signature = [config.mode, config.phase, key?.id ?? '-', root.name, quality, inversion, pattern, notes.map((note) => note.midi).join('.')].join('|')

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${random()}`,
    mode: config.mode,
    root,
    quality,
    inversion,
    pattern,
    notes,
    chordTones,
    key,
    scaleDegree,
    romanNumeral: scaleDegree === undefined ? undefined : ROMAN_NUMERALS[scaleDegree],
    presentation: config.phase,
    signature,
  }
}

export function validateExercise(exercise: Exercise): string[] {
  const errors: string[] = []
  const expectedNotes = exercise.presentation === 'arpeggio' ? 8 : 3
  if (exercise.notes.length !== expectedNotes) errors.push(`Exercise must contain ${expectedNotes} displayed notes.`)
  if (exercise.notes.some((note) => !exercise.chordTones.some((tone) => tone.pitchClass === note.pitchClass))) {
    errors.push('Exercise contains a non-chord tone.')
  }
  const lowest = Math.min(...exercise.notes.map((note) => note.midi))
  if (lowest % 12 !== exercise.chordTones[exercise.inversion].pitchClass) {
    errors.push('Lowest pitch does not match the intended inversion.')
  }
  if (Math.min(...exercise.notes.map((note) => note.midi)) < 36 || Math.max(...exercise.notes.map((note) => note.midi)) > 72) {
    errors.push('Exercise falls outside the supported left-hand register.')
  }
  if (new Set(exercise.notes.map((note) => note.toneIndex)).size !== 3) {
    errors.push('Exercise does not expose all three chord tones.')
  }
  return errors
}

export function generateConstructionExercise(
  roots: number[] = COMMON_ROOT_PITCH_CLASSES,
  qualities: ChordQuality[] = ['major', 'minor', 'diminished'],
  random: RandomSource = Math.random,
): ConstructionExercise {
  const pitchClass = choose(roots.length ? roots : COMMON_ROOT_PITCH_CLASSES, random)
  const root = ROOT_OPTIONS.find((item) => item.pitchClass === pitchClass) ?? ROOT_OPTIONS[0]
  const quality = choose(qualities.length ? qualities : QUALITIES, random)
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${random()}`,
    root,
    quality,
    chordTones: buildChord(root, quality) as [SpelledPitch, SpelledPitch, SpelledPitch],
  }
}

const INTERVAL_KINDS: IntervalKind[] = ['major-third', 'minor-third', 'perfect-fifth']

export function generateIntervalExercise(
  roots: number[] = COMMON_ROOT_PITCH_CLASSES,
  intervals: IntervalKind[] = INTERVAL_KINDS,
  random: RandomSource = Math.random,
): IntervalExercise {
  const pitchClass = choose(roots.length ? roots : COMMON_ROOT_PITCH_CLASSES, random)
  const lower = ROOT_OPTIONS.find((item) => item.pitchClass === pitchClass) ?? ROOT_OPTIONS[0]
  const interval = choose(intervals.length ? intervals : INTERVAL_KINDS, random)
  const upper = intervalAbove(lower, interval)
  const chordConnection = interval === 'major-third'
    ? `${upper.name} can be the 3rd of a ${lower.name} major chord.`
    : interval === 'minor-third'
      ? `${upper.name} can be the 3rd of a ${lower.name} minor or diminished chord.`
      : `${upper.name} is the stable 5th used by ${lower.name} major and minor triads.`
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${random()}`,
    lower,
    upper,
    interval,
    chordConnection,
  }
}

export function generateThirdIntervalExercise(
  recentSignatures: string[] = [],
  preferredInterval?: ThirdIntervalKind,
  random: RandomSource = Math.random,
): ThirdIntervalExercise {
  const intervals: ThirdIntervalKind[] = preferredInterval
    ? [preferredInterval]
    : ['major-third', 'minor-third']
  const candidates = ROOT_OPTIONS.flatMap((lower) => intervals.map((interval) => ({ lower, interval })))
  const fresh = candidates.filter(({ lower, interval }) => !recentSignatures.includes(`${lower.pitchClass}:${interval}`))
  const selected = choose(fresh.length ? fresh : candidates, random)
  const upper = intervalAbove(selected.lower, selected.interval)
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${random()}`,
    lower: selected.lower,
    upper,
    interval: selected.interval,
    semitones: selected.interval === 'major-third' ? 4 : 3,
    signature: `${selected.lower.pitchClass}:${selected.interval}`,
  }
}
