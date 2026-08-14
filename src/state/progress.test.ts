import { describe, expect, it } from 'vitest'
import { BEGINNER_CONFIG, generateExercise } from '../music/generator'
import type { Answer, ConstructionAttempt, ProgressData } from '../music/types'
import {
  EMPTY_PROGRESS,
  evaluateAnswer,
  exportProgress,
  importProgress,
  loadProgress,
  makeAttempt,
  recommendedActivity,
  recordAttempt,
  recordLearningAttempt,
} from './progress'

describe('progress tracking', () => {
  const exercise = generateExercise({ ...BEGINNER_CONFIG, roots: [0], qualities: ['major'], inversions: [0], patterns: ['ascending'] }, () => 0)

  it('scores each recognition dimension independently', () => {
    const answer: Answer = { root: 0, quality: 'minor', inversion: 0, romanNumeral: null }
    expect(evaluateAnswer(exercise, answer)).toEqual({ root: true, quality: false, inversion: true, romanNumeral: null, allCorrect: false })
  })

  it('updates mastery and the confusion matrix without an overall-only score', () => {
    const answer: Answer = { root: 7, quality: 'minor', inversion: 1, romanNumeral: null }
    const attempt = makeAttempt(exercise, answer, 2400)
    const next = recordAttempt(structuredClone(EMPTY_PROGRESS), attempt)
    expect(next.skills['root:0'].score).toBeLessThan(0.5)
    expect(next.skills['quality:major'].score).toBeLessThan(0.5)
    expect(next.skills['inversion:0'].score).toBeLessThan(0.5)
    expect(next.confusions['root:7→0']).toBe(1)
    expect(next.recentSignatures[0]).toBe(exercise.signature)
  })

  it('round-trips a local backup', () => {
    const progress: ProgressData = structuredClone(EMPTY_PROGRESS)
    const restored = importProgress(exportProgress(progress, BEGINNER_CONFIG))
    expect(restored.progress).toEqual(progress)
    expect(restored.config).toEqual(BEGINNER_CONFIG)
  })

  it('migrates version-one local progress without deleting recognition history', () => {
    const legacy = { ...structuredClone(EMPTY_PROGRESS), version: 1, learningAttempts: undefined }
    localStorage.setItem('shape-first.progress.v1', JSON.stringify(legacy))
    const migrated = loadProgress()
    expect(migrated.version).toBe(2)
    expect(migrated.learningAttempts).toEqual([])
  })

  it('tracks letter and accidental construction skills separately and identifies readiness', () => {
    let progress = structuredClone(EMPTY_PROGRESS)
    const makeConstruction = (index: number): ConstructionAttempt => ({
      id: String(index),
      kind: 'construction',
      timestamp: Date.now() + index,
      root: { name: index % 2 ? 'E♭' : 'C', pitchClass: index % 2 ? 3 : 0 },
      quality: index % 2 ? 'minor' : 'major',
      selectedThird: index % 2 ? 'G♭' : 'E',
      selectedFifth: index % 2 ? 'B♭' : 'G',
      correct: true,
      thirdCorrect: true,
      fifthCorrect: true,
      letterNamesCorrect: true,
      accidentalsCorrect: true,
      hintsUsed: 0,
      responseMs: 2000,
      errorTags: [],
    })
    expect(recommendedActivity(progress)).toBe('construction')
    for (let index = 0; index < 8; index += 1) progress = recordLearningAttempt(progress, makeConstruction(index))
    expect(progress.skills['spelling:letter-distance'].attempts).toBe(8)
    expect(progress.skills['spelling:accidentals'].attempts).toBe(8)
    expect(recommendedActivity(progress)).toBe('interval')
  })
})
