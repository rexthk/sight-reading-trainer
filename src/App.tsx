import { useState } from 'react'
import { BEGINNER_CONFIG } from './music/generator'
import type { Attempt, LearningAttempt, PracticeConfig, ProgressData } from './music/types'
import {
  EMPTY_PROGRESS,
  loadConfig,
  loadProgress,
  recordAttempt,
  recordLearningAttempt,
  recommendedActivity,
  saveConfig,
  saveProgress,
} from './state/progress'
import { PracticeSession } from './components/PracticeSession'
import { PracticeSetup } from './components/PracticeSetup'
import { ProgressView } from './components/ProgressView'
import { DataSettings } from './components/DataSettings'
import { BuildChordSession } from './components/BuildChordSession'
import { IntervalSession } from './components/IntervalSession'

type View = 'home' | 'setup' | 'practice' | 'build' | 'interval' | 'progress' | 'settings'

function Home({ progress, onContinue, onBuild, onIntervals, onRecognition, onCustom }: {
  progress: ProgressData
  onContinue: () => void
  onBuild: () => void
  onIntervals: () => void
  onRecognition: () => void
  onCustom: () => void
}) {
  const recent = progress.attempts.slice(-20)
  const accuracy = recent.length ? Math.round(recent.filter((attempt) => attempt.result.allCorrect).length / recent.length * 100) : null
  const weakest = Object.entries(progress.skills).sort((a, b) => a[1].score - b[1].score)[0]
  const recommended = recommendedActivity(progress)
  const recommendationLabel = recommended === 'construction' ? 'Build the Chord' : recommended === 'interval' ? 'Interval Lab' : `${recommended.replace('-', ' ')} recognition`

  return (
    <main className="home-page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">LEFT-HAND HARMONY TRAINING</p>
          <h1>Read the shape.<br /><em>Hear the chord.</em></h1>
          <p className="hero-intro">Stop decoding eight separate notes. Learn to recognise one harmonic object before your hand reaches the keys.</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={onContinue}>Continue learning <span>{recommendationLabel}</span></button>
            <button className="secondary-button" onClick={onCustom}>Build a custom drill</button>
          </div>
        </div>
        <div className="shape-illustration" aria-hidden="true">
          <div className="staff-lines" />
          <i className="shape-note one" /><i className="shape-note two" /><i className="shape-note three" /><i className="shape-note four" />
          <svg viewBox="0 0 400 260"><path d="M58 211 C125 192, 184 150, 237 119 S332 72, 350 52" /></svg>
          <div className="collapse-label"><span>8 notes</span><b>→</b><strong>1 shape</strong></div>
        </div>
      </section>

      <section className="learning-path-section">
        <div className="section-heading"><p className="eyebrow">CONSTRUCT → RECOGNISE</p><h2>Reason slowly. Then let the pattern become fast.</h2></div>
        <div className="learning-path-grid">
          <button onClick={onBuild}><span>A</span><div><b>Build the Chord</b><p>Derive the 3rd and 5th: letter name first, accidental second.</p></div><i>→</i></button>
          <button onClick={onIntervals}><span>B</span><div><b>Interval Lab</b><p>Learn M3, m3 and P5 only where they support triads.</p></div><i>→</i></button>
          <button onClick={onRecognition}><span>C</span><div><b>Guided Recognition</b><p>Reorder into 3rds, identify the root, then return to the bass.</p></div><i>→</i></button>
        </div>
      </section>

      <section className="home-insight">
        <div><span className="insight-number">{progress.attempts.length + progress.learningAttempts.length}</span><p>learning decisions on this device</p></div>
        <div><span className="insight-number">{accuracy === null ? '—' : `${accuracy}%`}</span><p>recent whole-chord accuracy</p></div>
        <div><span className="insight-number small">{weakest ? weakest[0].split(':').join(' · ') : 'Start here'}</span><p>{weakest ? 'current adaptive target' : 'build your personal weakness map'}</p></div>
      </section>

      <section className="method-section">
        <div className="section-heading"><p className="eyebrow">THE RECOGNITION LOOP</p><h2>Three decisions. One mental object.</h2></div>
        <div className="method-grid">
          <article><span>01</span><h3>Find the root</h3><p>Rearrange the pitch collection mentally. Do not assume the first or lowest note is the root.</p></article>
          <article><span>02</span><h3>Name the quality</h3><p>Notice the major-third/minor-third structure instead of memorising one fixed voicing.</p></article>
          <article><span>03</span><h3>Read the bass</h3><p>Compare the lowest pitch with the root to recognise the inversion and prepare your hand.</p></article>
        </div>
      </section>
    </main>
  )
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [progress, setProgress] = useState(loadProgress)
  const [config, setConfig] = useState(() => loadConfig(BEGINNER_CONFIG))
  const [sessionConfig, setSessionConfig] = useState(config)

  const updateConfig = (next: PracticeConfig) => {
    setConfig(next)
    saveConfig(next)
  }
  const handleAttempt = (attempt: Attempt) => {
    setProgress((current) => {
      const next = recordAttempt(current, attempt)
      saveProgress(next)
      return next
    })
  }
  const handleLearningAttempt = (attempt: LearningAttempt) => {
    setProgress((current) => {
      const next = recordLearningAttempt(current, attempt)
      saveProgress(next)
      return next
    })
  }
  const start = (nextConfig: PracticeConfig) => {
    setSessionConfig(structuredClone(nextConfig))
    setView('practice')
  }

  if (view === 'practice') {
    return <PracticeSession config={sessionConfig} progress={progress} onRecord={handleAttempt} onExit={() => setView('home')} />
  }
  if (view === 'build') return <BuildChordSession progress={progress} onRecord={handleLearningAttempt} onExit={() => setView('home')} />
  if (view === 'interval') return <IntervalSession progress={progress} onRecord={handleLearningAttempt} onExit={() => setView('home')} />

  const startRecommended = () => {
    const activity = recommendedActivity(progress)
    if (activity === 'construction') { setView('build'); return }
    if (activity === 'interval') { setView('interval'); return }
    start({ ...config, style: 'learning', timer: 0, phase: activity })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView('home')} aria-label="Shape First home"><span>♩</span><b>Shape First</b></button>
        <nav aria-label="Main navigation">
          <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>Practice</button>
          <button className={view === 'progress' ? 'active' : ''} onClick={() => setView('progress')}>Progress</button>
          <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}>Settings</button>
        </nav>
      </header>

      {view === 'home' && <Home progress={progress} onContinue={startRecommended} onBuild={() => setView('build')} onIntervals={() => setView('interval')} onRecognition={() => start({ ...config, style: 'learning', timer: 0 })} onCustom={() => setView('setup')} />}
      {view === 'setup' && <PracticeSetup config={config} progress={progress} onChange={updateConfig} onStart={() => start(config)} />}
      {view === 'progress' && <ProgressView progress={progress} />}
      {view === 'settings' && (
        <DataSettings
          progress={progress}
          config={config}
          onImport={(nextProgress, nextConfig) => {
            setProgress(nextProgress)
            saveProgress(nextProgress)
            if (nextConfig) updateConfig(nextConfig)
          }}
          onReset={() => {
            const empty = structuredClone(EMPTY_PROGRESS)
            setProgress(empty)
            saveProgress(empty)
          }}
        />
      )}
      <footer><span>Shape First</span><p>Read hierarchically: notes → intervals → chords → function.</p></footer>
    </div>
  )
}
