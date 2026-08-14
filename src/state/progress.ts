import { generateExercise, type RandomSource } from '../music/generator'
import type {
  Answer,
  AnswerResult,
  Attempt,
  ErrorCause,
  Exercise,
  LearningAttempt,
  PracticeConfig,
  ProgressData,
  SkillStat,
} from '../music/types'
import { ROMAN_NUMERALS } from '../music/theory'

export const PROGRESS_KEY = 'shape-first.progress.v1'
export const CONFIG_KEY = 'shape-first.config.v1'

export const EMPTY_PROGRESS: ProgressData = {
  version: 2,
  attempts: [],
  learningAttempts: [],
  skills: {},
  confusions: {},
  recentSignatures: [],
}

export function loadProgress(): ProgressData {
  try {
    const saved = localStorage.getItem(PROGRESS_KEY)
    if (!saved) return structuredClone(EMPTY_PROGRESS)
    const parsed = JSON.parse(saved) as ProgressData & { version: number }
    if (![1, 2].includes(parsed.version) || !Array.isArray(parsed.attempts)) return structuredClone(EMPTY_PROGRESS)
    const migratedAttempts = parsed.attempts.map((attempt) => ({
      ...attempt,
      assisted: attempt.assisted ?? false,
      errorTags: attempt.errorTags ?? [],
      exercise: { ...attempt.exercise, presentation: attempt.exercise.presentation ?? 'arpeggio' },
    }))
    return {
      ...structuredClone(EMPTY_PROGRESS),
      ...parsed,
      version: 2,
      attempts: migratedAttempts,
      learningAttempts: parsed.learningAttempts ?? [],
    }
  } catch {
    return structuredClone(EMPTY_PROGRESS)
  }
}

export function saveProgress(progress: ProgressData): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}

export function loadConfig(fallback: PracticeConfig): PracticeConfig {
  try {
    const saved = localStorage.getItem(CONFIG_KEY)
    if (!saved) return fallback
    return { ...fallback, ...JSON.parse(saved) }
  } catch {
    return fallback
  }
}

export function saveConfig(config: PracticeConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

export function evaluateAnswer(exercise: Exercise, answer: Answer): AnswerResult {
  const root = answer.root === exercise.root.pitchClass
  const quality = answer.quality === exercise.quality
  const inversion = answer.inversion === exercise.inversion
  const romanNumeral = exercise.mode === 'in-key'
    ? answer.romanNumeral === exercise.romanNumeral
    : null
  return {
    root,
    quality,
    inversion,
    romanNumeral,
    allCorrect: root && quality && inversion && romanNumeral !== false,
  }
}

export function skillKeys(exercise: Exercise): string[] {
  const keys = [
    `root:${exercise.root.pitchClass}`,
    `quality:${exercise.quality}`,
    `inversion:${exercise.inversion}`,
    `pattern:${exercise.pattern}`,
    `phase:${exercise.presentation}`,
    `mode:${exercise.mode}`,
  ]
  if (exercise.key) keys.push(`key:${exercise.key.id}`)
  if (exercise.scaleDegree !== undefined) keys.push(`degree:${exercise.scaleDegree}`)
  return keys
}

function outcomeForKey(key: string, attempt: Attempt): number {
  let correct: boolean
  if (key.startsWith('root:')) correct = attempt.result.root
  else if (key.startsWith('quality:')) correct = attempt.result.quality
  else if (key.startsWith('inversion:')) correct = attempt.result.inversion
  else if (key.startsWith('degree:')) correct = attempt.result.romanNumeral === true
  else if (key.startsWith('phase:')) correct = attempt.result.allCorrect
  else correct = attempt.result.root && attempt.result.quality
  return correct ? (attempt.assisted ? 0.55 : 1) : 0
}

function updateStat(stat: SkillStat | undefined, outcome: number, responseMs: number, timestamp: number): SkillStat {
  const previous = stat ?? {
    score: 0.5,
    attempts: 0,
    correct: 0,
    averageMs: 0,
    streak: 0,
    lastPracticed: 0,
  }
  return {
    score: Number((previous.score * 0.8 + outcome * 0.2).toFixed(4)),
    attempts: previous.attempts + 1,
    correct: previous.correct + (outcome > 0 ? 1 : 0),
    averageMs: previous.attempts === 0
      ? responseMs
      : Math.round((previous.averageMs * previous.attempts + responseMs) / (previous.attempts + 1)),
    streak: outcome >= 0.99 ? previous.streak + 1 : 0,
    lastPracticed: timestamp,
  }
}

function addConfusion(confusions: Record<string, number>, dimension: string, chosen: string | number | null, correct: string | number): void {
  if (chosen === null || String(chosen) === String(correct)) return
  const key = `${dimension}:${chosen}→${correct}`
  confusions[key] = (confusions[key] ?? 0) + 1
}

export function recordAttempt(progress: ProgressData, attempt: Attempt): ProgressData {
  const next: ProgressData = structuredClone(progress)
  next.attempts = [...next.attempts, attempt].slice(-500)
  next.recentSignatures = [attempt.exercise.signature, ...next.recentSignatures.filter((item) => item !== attempt.exercise.signature)].slice(0, 20)

  const exerciseLike = {
    root: { pitchClass: attempt.exercise.root },
    quality: attempt.exercise.quality,
    inversion: attempt.exercise.inversion,
    pattern: attempt.exercise.pattern,
    mode: attempt.exercise.mode,
    key: attempt.exercise.key ? { id: attempt.exercise.key } : undefined,
    scaleDegree: attempt.exercise.scaleDegree,
    presentation: attempt.exercise.presentation,
  } as Exercise

  for (const key of skillKeys(exerciseLike)) {
    next.skills[key] = updateStat(next.skills[key], outcomeForKey(key, attempt), attempt.responseMs, attempt.timestamp)
  }
  for (const cause of attempt.errorTags) {
    const confusionKey = `cause:${cause}`
    next.confusions[confusionKey] = (next.confusions[confusionKey] ?? 0) + 1
  }

  addConfusion(next.confusions, 'root', attempt.answer.root, attempt.exercise.root)
  addConfusion(next.confusions, 'quality', attempt.answer.quality, attempt.exercise.quality)
  addConfusion(next.confusions, 'inversion', attempt.answer.inversion, attempt.exercise.inversion)
  if (attempt.exercise.scaleDegree !== undefined) {
    addConfusion(next.confusions, 'degree', attempt.answer.romanNumeral, ROMAN_NUMERALS[attempt.exercise.scaleDegree])
  }
  return next
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

export function generateAdaptiveExercise(
  config: PracticeConfig,
  progress: ProgressData,
  random: RandomSource = Math.random,
): Exercise {
  const pool = Array.from({ length: 60 }, () => generateExercise(config, random))
  const freshPool = pool.filter((exercise) => !progress.recentSignatures.includes(exercise.signature))
  const candidates = freshPool.length ? freshPool : pool
  const now = Date.now()
  const scored = candidates.map((exercise) => {
    const stats = skillKeys(exercise).map((key) => progress.skills[key])
    return {
      exercise,
      weakness: average(stats.map((stat) => 1 - (stat?.score ?? 0.35))),
      age: average(stats.map((stat) => stat ? Math.min((now - stat.lastPracticed) / 86_400_000, 30) / 30 : 1)),
      unseen: stats.filter((stat) => !stat).length / stats.length,
    }
  })
  const roll = random()
  if (roll < 0.7) scored.sort((a, b) => b.weakness - a.weakness)
  else if (roll < 0.9) scored.sort((a, b) => b.age - a.age)
  else scored.sort((a, b) => b.unseen - a.unseen)
  return scored[0].exercise
}

export function makeAttempt(
  exercise: Exercise,
  answer: Answer,
  responseMs: number,
  timedOut = false,
  assisted = false,
  extraErrorTags: ErrorCause[] = [],
): Attempt {
  const result = evaluateAnswer(exercise, answer)
  const errorTags = [...extraErrorTags]
  if (!result.root) errorTags.push('root-unknown')
  if (!result.quality) errorTags.push('quality-unknown')
  if (!result.inversion) {
    errorTags.push('inversion-unknown')
    const bassPitchClass = Math.min(...exercise.notes.map((note) => note.midi)) % 12
    if (answer.root === bassPitchClass && bassPitchClass !== exercise.root.pitchClass) errorTags.push('bass-root-confusion')
  }
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
    timestamp: Date.now(),
    exercise: {
      mode: exercise.mode,
      root: exercise.root.pitchClass,
      quality: exercise.quality,
      inversion: exercise.inversion,
      pattern: exercise.pattern,
      key: exercise.key?.id,
      scaleDegree: exercise.scaleDegree,
      presentation: exercise.presentation,
      signature: exercise.signature,
    },
    answer,
    result,
    responseMs,
    timedOut,
    assisted,
    errorTags: [...new Set(errorTags)],
  }
}

export function recordLearningAttempt(progress: ProgressData, attempt: LearningAttempt): ProgressData {
  const next: ProgressData = structuredClone(progress)
  next.learningAttempts = [...next.learningAttempts, attempt].slice(-500)
  const outcome = attempt.correct ? 1 : 0
  if (attempt.kind === 'construction') {
    const assistedOutcome = attempt.correct ? (attempt.hintsUsed ? 0.65 : 1) : 0
    const keys: Array<[string, number]> = [
      [`phase:construction`, assistedOutcome],
      [`construction:${attempt.quality}`, assistedOutcome],
      [`construction-root:${attempt.root.pitchClass}`, assistedOutcome],
      ['spelling:letter-distance', attempt.letterNamesCorrect ? assistedOutcome : 0],
      ['spelling:accidentals', attempt.accidentalsCorrect ? assistedOutcome : 0],
    ]
    const thirdKind = attempt.quality === 'major' ? 'major-third' : 'minor-third'
    keys.push([`interval:${thirdKind}`, attempt.thirdCorrect ? assistedOutcome : 0])
    keys.push([`interval:${attempt.quality === 'diminished' ? 'diminished-fifth' : 'perfect-fifth'}`, attempt.fifthCorrect ? assistedOutcome : 0])
    for (const [key, value] of keys) next.skills[key] = updateStat(next.skills[key], value, attempt.responseMs, attempt.timestamp)
  } else {
    next.skills[`phase:interval`] = updateStat(next.skills[`phase:interval`], outcome, attempt.responseMs, attempt.timestamp)
    next.skills[`interval:${attempt.interval}`] = updateStat(next.skills[`interval:${attempt.interval}`], outcome, attempt.responseMs, attempt.timestamp)
  }
  for (const cause of attempt.errorTags) {
    const key = `cause:${cause}`
    next.confusions[key] = (next.confusions[key] ?? 0) + 1
  }
  return next
}

export type RecommendedActivity = 'construction' | 'interval' | 'root-position' | 'inversion' | 'spread' | 'arpeggio'

export function recommendedActivity(progress: ProgressData): RecommendedActivity {
  const constructionCount = progress.learningAttempts.filter((attempt) => attempt.kind === 'construction').length
  if (constructionCount < 8 || (progress.skills['phase:construction']?.score ?? 0) < 0.68) return 'construction'
  const intervalCount = progress.learningAttempts.filter((attempt) => attempt.kind === 'interval').length
  if (intervalCount < 6 || (progress.skills['phase:interval']?.score ?? 0) < 0.68) return 'interval'
  const phases: RecommendedActivity[] = ['root-position', 'inversion', 'spread', 'arpeggio']
  for (const phase of phases) {
    const stat = progress.skills[`phase:${phase}`]
    if (!stat || stat.attempts < 6 || stat.score < 0.72) return phase
  }
  return 'arpeggio'
}

export function exportProgress(progress: ProgressData, config: PracticeConfig): string {
  return JSON.stringify({ app: 'shape-first', exportedAt: new Date().toISOString(), progress, config }, null, 2)
}

export function importProgress(json: string): { progress: ProgressData; config?: PracticeConfig } {
  const parsed = JSON.parse(json) as { app?: string; progress?: ProgressData & { version: number }; config?: PracticeConfig }
  if (parsed.app !== 'shape-first' || !parsed.progress || ![1, 2].includes(parsed.progress.version)) throw new Error('This is not a valid Shape First backup.')
  const progress: ProgressData = {
    ...structuredClone(EMPTY_PROGRESS),
    ...parsed.progress,
    version: 2,
    learningAttempts: parsed.progress.learningAttempts ?? [],
    attempts: parsed.progress.attempts.map((attempt) => ({
      ...attempt,
      assisted: attempt.assisted ?? false,
      errorTags: attempt.errorTags ?? [],
      exercise: { ...attempt.exercise, presentation: attempt.exercise.presentation ?? 'arpeggio' },
    })),
  }
  return { progress, config: parsed.config }
}
