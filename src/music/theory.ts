import type { ChordQuality, IntervalKind, KeyDefinition, SpelledPitch } from './types'

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
const NATURAL_PCS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11]
const QUALITY_INTERVALS: Record<ChordQuality, [number, number, number]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
}

export const ROOT_OPTIONS: SpelledPitch[] = [
  { name: 'C', pitchClass: 0 },
  { name: 'D♭', pitchClass: 1 },
  { name: 'D', pitchClass: 2 },
  { name: 'E♭', pitchClass: 3 },
  { name: 'E', pitchClass: 4 },
  { name: 'F', pitchClass: 5 },
  { name: 'F♯', pitchClass: 6 },
  { name: 'G', pitchClass: 7 },
  { name: 'A♭', pitchClass: 8 },
  { name: 'A', pitchClass: 9 },
  { name: 'B♭', pitchClass: 10 },
  { name: 'B', pitchClass: 11 },
]

const KEY_SPECS: Array<[string, string, string[]]> = [
  ['C', 'C', ['C', 'D', 'E', 'F', 'G', 'A', 'B']],
  ['G', 'G', ['G', 'A', 'B', 'C', 'D', 'E', 'F♯']],
  ['D', 'D', ['D', 'E', 'F♯', 'G', 'A', 'B', 'C♯']],
  ['A', 'A', ['A', 'B', 'C♯', 'D', 'E', 'F♯', 'G♯']],
  ['E', 'E', ['E', 'F♯', 'G♯', 'A', 'B', 'C♯', 'D♯']],
  ['B', 'B', ['B', 'C♯', 'D♯', 'E', 'F♯', 'G♯', 'A♯']],
  ['F#', 'F♯', ['F♯', 'G♯', 'A♯', 'B', 'C♯', 'D♯', 'E♯']],
  ['Db', 'D♭', ['D♭', 'E♭', 'F', 'G♭', 'A♭', 'B♭', 'C']],
  ['Ab', 'A♭', ['A♭', 'B♭', 'C', 'D♭', 'E♭', 'F', 'G']],
  ['Eb', 'E♭', ['E♭', 'F', 'G', 'A♭', 'B♭', 'C', 'D']],
  ['Bb', 'B♭', ['B♭', 'C', 'D', 'E♭', 'F', 'G', 'A']],
  ['F', 'F', ['F', 'G', 'A', 'B♭', 'C', 'D', 'E']],
]

export function pitchClassFromName(name: string): number {
  const letter = name[0]
  let pitch = NATURAL_PCS[letter]
  for (const symbol of name.slice(1)) {
    if (symbol === '♯' || symbol === '#') pitch += 1
    if (symbol === '♭' || symbol === 'b') pitch -= 1
  }
  return ((pitch % 12) + 12) % 12
}

export const MAJOR_KEYS: KeyDefinition[] = KEY_SPECS.map(([id, name, notes]) => ({
  id,
  name,
  vexKey: id,
  tonic: pitchClassFromName(notes[0]),
  scale: notes.map((note) => ({ name: note, pitchClass: pitchClassFromName(note) })),
}))

export const MAJOR_QUALITIES: ChordQuality[] = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished']
export const ROMAN_NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
export const COMMON_ROOT_PITCH_CLASSES = [0, 7, 5, 2, 10]
export const INTERVAL_SEMITONES: Record<IntervalKind, number> = {
  'major-third': 4,
  'minor-third': 3,
  'perfect-fifth': 7,
}
export const INTERVAL_LABELS: Record<IntervalKind, string> = {
  'major-third': 'Major 3rd',
  'minor-third': 'Minor 3rd',
  'perfect-fifth': 'Perfect 5th',
}
export const QUALITY_FORMULAS: Record<ChordQuality, { rootIntervals: string; stacked: string; short: string }> = {
  major: { rootIntervals: 'Major 3rd + Perfect 5th', stacked: 'Major 3rd + minor 3rd', short: 'M3 + m3' },
  minor: { rootIntervals: 'Minor 3rd + Perfect 5th', stacked: 'Minor 3rd + major 3rd', short: 'm3 + M3' },
  diminished: { rootIntervals: 'Minor 3rd + diminished 5th', stacked: 'Minor 3rd + minor 3rd', short: 'm3 + m3' },
}

function accidentalForDifference(difference: number): string {
  let diff = ((difference + 6) % 12) - 6
  if (diff > 2) diff -= 12
  if (diff < -2) diff += 12
  if (diff === 2) return '♯♯'
  if (diff === 1) return '♯'
  if (diff === -1) return '♭'
  if (diff === -2) return '♭♭'
  return ''
}

export function spellIntervalAbove(root: SpelledPitch, letterSteps: number, semitones: number): SpelledPitch {
  const rootLetterIndex = LETTERS.indexOf(root.name[0] as (typeof LETTERS)[number])
  const letter = LETTERS[(rootLetterIndex + letterSteps) % 7]
  const pitchClass = (root.pitchClass + semitones) % 12
  return {
    name: `${letter}${accidentalForDifference(pitchClass - NATURAL_PCS[letter])}`,
    pitchClass,
  }
}

export function buildChord(root: SpelledPitch, quality: ChordQuality): SpelledPitch[] {
  const intervals = QUALITY_INTERVALS[quality]
  return intervals.map((semitones, index) => spellIntervalAbove(root, index * 2, semitones))
}

export function noteLetter(name: string): string {
  return name[0]
}

export function noteAccidental(name: string): string {
  return name.slice(1) || '♮'
}

export function spellForLetterAndPitchClass(letter: string, pitchClass: number): string | null {
  const natural = NATURAL_PCS[letter]
  if (natural === undefined) return null
  const difference = ((pitchClass - natural + 6) % 12) - 6
  if (difference > 2 || difference < -2) return null
  return `${letter}${accidentalForDifference(difference)}`
}

export function letterDistancePath(rootName: string, letterSteps: number): string[] {
  const start = LETTERS.indexOf(rootName[0] as (typeof LETTERS)[number])
  return Array.from({ length: letterSteps + 1 }, (_, index) => LETTERS[(start + index) % 7])
}

export function intervalAbove(root: SpelledPitch, interval: IntervalKind): SpelledPitch {
  const letterSteps = interval === 'perfect-fifth' ? 4 : 2
  return spellIntervalAbove(root, letterSteps, INTERVAL_SEMITONES[interval])
}

export function stackedThirdKinds(quality: ChordQuality): [IntervalKind, IntervalKind] {
  if (quality === 'major') return ['major-third', 'minor-third']
  if (quality === 'minor') return ['minor-third', 'major-third']
  return ['minor-third', 'minor-third']
}

export function classifySimpleInterval(lower: SpelledPitch, upper: SpelledPitch): string {
  const semitones = (upper.pitchClass - lower.pitchClass + 12) % 12
  const lowerIndex = LETTERS.indexOf(lower.name[0] as (typeof LETTERS)[number])
  const upperIndex = LETTERS.indexOf(upper.name[0] as (typeof LETTERS)[number])
  const letterDistance = (upperIndex - lowerIndex + 7) % 7
  if (letterDistance === 2 && semitones === 4) return 'Major 3rd'
  if (letterDistance === 2 && semitones === 3) return 'minor 3rd'
  if (letterDistance === 4 && semitones === 7) return 'Perfect 5th'
  if (letterDistance === 4 && semitones === 6) return 'diminished 5th'
  if (letterDistance === 3 && semitones === 5) return 'Perfect 4th'
  return `${semitones} semitones`
}

export function chordSymbol(root: SpelledPitch, quality: ChordQuality): string {
  if (quality === 'minor') return `${root.name}m`
  if (quality === 'diminished') return `${root.name}°`
  return root.name
}

export function qualityLabel(quality: ChordQuality): string {
  return quality[0].toUpperCase() + quality.slice(1)
}

export function inversionLabel(inversion: number): string {
  return ['Root position', 'First inversion', 'Second inversion'][inversion] ?? 'Unknown inversion'
}

export function patternLabel(pattern: string): string {
  if (pattern === 'octave') return 'Octave-displaced'
  return pattern[0].toUpperCase() + pattern.slice(1)
}

export function toVexPitchName(name: string): string {
  return name.replaceAll('♯', '#').replaceAll('♭', 'b').toLowerCase()
}

export function rootLabelForExercise(pitchClass: number, key?: KeyDefinition): string {
  return key?.scale.find((note) => note.pitchClass === pitchClass)?.name
    ?? ROOT_OPTIONS.find((note) => note.pitchClass === pitchClass)?.name
    ?? '?'
}

export function keyById(id: string): KeyDefinition {
  return MAJOR_KEYS.find((key) => key.id === id) ?? MAJOR_KEYS[0]
}

export function expectedMajorScalePitchClasses(tonic: number): number[] {
  return MAJOR_STEPS.map((step) => (tonic + step) % 12)
}
