import { describe, expect, it } from 'vitest'
import {
  buildChord,
  expectedMajorScalePitchClasses,
  MAJOR_KEYS,
  MAJOR_QUALITIES,
  pitchClassFromName,
  ROOT_OPTIONS,
} from './theory'
import type { ChordQuality } from './types'

describe('music theory', () => {
  it('spells every triad as root, third and fifth', () => {
    const expected: Record<ChordQuality, number[]> = {
      major: [0, 4, 7],
      minor: [0, 3, 7],
      diminished: [0, 3, 6],
    }
    for (const root of ROOT_OPTIONS) {
      for (const quality of Object.keys(expected) as ChordQuality[]) {
        const chord = buildChord(root, quality)
        expect(chord.map((tone) => (tone.pitchClass - root.pitchClass + 12) % 12)).toEqual(expected[quality])
        expect(chord.map((tone) => tone.name[0])).toHaveLength(3)
      }
    }
  })

  it('uses theoretically correct spellings rather than enharmonic shortcuts', () => {
    expect(buildChord({ name: 'D♭', pitchClass: 1 }, 'diminished').map((tone) => tone.name)).toEqual(['D♭', 'F♭', 'A♭♭'])
    expect(buildChord({ name: 'F♯', pitchClass: 6 }, 'major').map((tone) => tone.name)).toEqual(['F♯', 'A♯', 'C♯'])
  })

  it('defines twelve valid major keys and their diatonic triads', () => {
    expect(MAJOR_KEYS).toHaveLength(12)
    expect(new Set(MAJOR_KEYS.map((key) => key.tonic))).toHaveLength(12)
    for (const key of MAJOR_KEYS) {
      expect(key.scale.map((note) => note.pitchClass)).toEqual(expectedMajorScalePitchClasses(key.tonic))
      key.scale.forEach((root, degree) => {
        const chord = buildChord(root, MAJOR_QUALITIES[degree])
        expect(chord.every((tone) => key.scale.some((scaleTone) => scaleTone.pitchClass === tone.pitchClass))).toBe(true)
      })
    }
  })

  it('parses single and double accidentals', () => {
    expect(pitchClassFromName('E♯')).toBe(5)
    expect(pitchClassFromName('A♭♭')).toBe(7)
  })
})

