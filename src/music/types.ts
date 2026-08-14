export type ChordQuality = 'major' | 'minor' | 'diminished'
export type Inversion = 0 | 1 | 2
export type PatternName = 'ascending' | 'descending' | 'alternating' | 'alberti' | 'octave'
export type ExerciseMode = 'absolute' | 'in-key'
export type TimerSetting = 0 | 3 | 5 | 10
export type RecognitionStyle = 'learning' | 'instant'
export type RecognitionPhase = 'root-position' | 'inversion' | 'spread' | 'arpeggio'
export type IntervalKind = 'major-third' | 'minor-third' | 'perfect-fifth'
export type ErrorCause =
  | 'root-unknown'
  | 'quality-unknown'
  | 'inversion-unknown'
  | 'accidental-error'
  | 'letter-distance-error'
  | 'bass-root-confusion'
  | 'interval-error'

export interface SpelledPitch {
  name: string
  pitchClass: number
}

export interface KeyDefinition {
  id: string
  name: string
  vexKey: string
  tonic: number
  scale: SpelledPitch[]
}

export interface ExerciseNote extends SpelledPitch {
  midi: number
  octave: number
  vexKey: string
  toneIndex: 0 | 1 | 2
}

export interface ConstructionExercise {
  id: string
  root: SpelledPitch
  quality: ChordQuality
  chordTones: [SpelledPitch, SpelledPitch, SpelledPitch]
}

export interface IntervalExercise {
  id: string
  lower: SpelledPitch
  upper: SpelledPitch
  interval: IntervalKind
  chordConnection: string
}

export interface Exercise {
  id: string
  mode: ExerciseMode
  root: SpelledPitch
  quality: ChordQuality
  inversion: Inversion
  pattern: PatternName
  notes: ExerciseNote[]
  chordTones: SpelledPitch[]
  key?: KeyDefinition
  scaleDegree?: number
  romanNumeral?: string
  presentation: RecognitionPhase
  signature: string
}

export interface PracticeConfig {
  mode: ExerciseMode
  roots: number[]
  qualities: ChordQuality[]
  inversions: Inversion[]
  patterns: PatternName[]
  keys: string[]
  timer: TimerSetting
  style: RecognitionStyle
  phase: RecognitionPhase
}

export interface Answer {
  root: number | null
  quality: ChordQuality | null
  inversion: Inversion | null
  romanNumeral: string | null
}

export interface AnswerResult {
  root: boolean
  quality: boolean
  inversion: boolean
  romanNumeral: boolean | null
  allCorrect: boolean
}

export interface Attempt {
  id: string
  timestamp: number
  exercise: Pick<Exercise, 'mode' | 'quality' | 'inversion' | 'pattern' | 'signature'> & {
    root: number
    key?: string
    scaleDegree?: number
    presentation: RecognitionPhase
  }
  answer: Answer
  result: AnswerResult
  responseMs: number
  timedOut: boolean
  assisted: boolean
  errorTags: ErrorCause[]
}

export interface ConstructionAttempt {
  id: string
  kind: 'construction'
  timestamp: number
  root: SpelledPitch
  quality: ChordQuality
  selectedThird: string
  selectedFifth: string
  correct: boolean
  thirdCorrect: boolean
  fifthCorrect: boolean
  letterNamesCorrect: boolean
  accidentalsCorrect: boolean
  hintsUsed: number
  responseMs: number
  errorTags: ErrorCause[]
}

export interface IntervalAttempt {
  id: string
  kind: 'interval'
  timestamp: number
  lower: SpelledPitch
  upper: SpelledPitch
  interval: IntervalKind
  selected: IntervalKind | null
  correct: boolean
  responseMs: number
  errorTags: ErrorCause[]
}

export type LearningAttempt = ConstructionAttempt | IntervalAttempt

export interface SkillStat {
  score: number
  attempts: number
  correct: number
  averageMs: number
  streak: number
  lastPracticed: number
}

export interface ProgressData {
  version: 2
  attempts: Attempt[]
  learningAttempts: LearningAttempt[]
  skills: Record<string, SkillStat>
  confusions: Record<string, number>
  recentSignatures: string[]
}

export const QUALITIES: ChordQuality[] = ['major', 'minor', 'diminished']
export const INVERSIONS: Inversion[] = [0, 1, 2]
export const PATTERNS: PatternName[] = ['ascending', 'descending', 'alternating', 'alberti', 'octave']
