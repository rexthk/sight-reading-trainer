import { describe, expect, it } from 'vitest'
import { generateConstructionExercise, generateExercise, generateIntervalExercise, validateExercise } from './generator'
import { INVERSIONS, PATTERNS, QUALITIES, type PracticeConfig } from './types'
import { MAJOR_KEYS, ROOT_OPTIONS } from './theory'

function seeded(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 0x1_0000_0000
  }
}

const base: PracticeConfig = {
  mode: 'absolute',
  roots: [0],
  qualities: ['major'],
  inversions: [0],
  patterns: ['ascending'],
  keys: ['C'],
  timer: 0,
  style: 'learning',
  phase: 'arpeggio',
}

describe('exercise generator', () => {
  it('generates valid exercises for every absolute triad combination', () => {
    let seed = 1
    for (const root of ROOT_OPTIONS) {
      for (const quality of QUALITIES) {
        for (const inversion of INVERSIONS) {
          for (const pattern of PATTERNS) {
            const exercise = generateExercise({ ...base, roots: [root.pitchClass], qualities: [quality], inversions: [inversion], patterns: [pattern] }, seeded(seed++))
            expect(validateExercise(exercise), exercise.signature).toEqual([])
            expect(exercise.notes).toHaveLength(8)
            expect(exercise.root.pitchClass).toBe(root.pitchClass)
            expect(exercise.quality).toBe(quality)
            expect(exercise.inversion).toBe(inversion)
          }
        }
      }
    }
  })

  it('generates valid diatonic exercises in every supported key', () => {
    MAJOR_KEYS.forEach((key, index) => {
      for (let sample = 0; sample < 30; sample += 1) {
        const exercise = generateExercise({
          ...base,
          mode: 'in-key',
          keys: [key.id],
          qualities: [...QUALITIES],
          inversions: [...INVERSIONS],
          patterns: [...PATTERNS],
        }, seeded(index * 100 + sample + 1))
        expect(validateExercise(exercise), exercise.signature).toEqual([])
        expect(exercise.key?.id).toBe(key.id)
        expect(exercise.romanNumeral).toBeTruthy()
        expect(exercise.chordTones.every((tone) => key.scale.some((scaleTone) => tone.pitchClass === scaleTone.pitchClass))).toBe(true)
      }
    })
  })

  it('validates every recognition phase and forces root position in phase A', () => {
    let seed = 91
    for (const root of ROOT_OPTIONS) {
      for (const quality of QUALITIES) {
        for (const inversion of INVERSIONS) {
          for (const phase of ['root-position', 'inversion', 'spread', 'arpeggio'] as const) {
            const exercise = generateExercise({ ...base, roots: [root.pitchClass], qualities: [quality], phase, inversions: [inversion] }, seeded(seed++))
            expect(validateExercise(exercise), exercise.signature).toEqual([])
            expect(exercise.notes).toHaveLength(phase === 'arpeggio' ? 8 : 3)
            expect(exercise.inversion).toBe(phase === 'root-position' ? 0 : inversion)
          }
        }
      }
    }
  })

  it('generates construction and chord-connected interval questions without a spelling lookup table', () => {
    const construction = generateConstructionExercise([3], ['major'], () => 0)
    expect(construction.chordTones.map((tone) => tone.name)).toEqual(['E♭', 'G', 'B♭'])
    const interval = generateIntervalExercise([3], ['major-third'], () => 0)
    expect([interval.lower.name, interval.upper.name, interval.interval]).toEqual(['E♭', 'G', 'major-third'])
    expect(interval.chordConnection).toContain('E♭ major chord')
  })
})
