import { useRef, useState } from 'react'
import type { PracticeConfig, ProgressData } from '../music/types'
import { exportProgress, importProgress } from '../state/progress'

interface Props {
  progress: ProgressData
  config: PracticeConfig
  onImport: (progress: ProgressData, config?: PracticeConfig) => void
  onReset: () => void
}

export function DataSettings({ progress, config, onImport, onReset }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  const download = () => {
    const blob = new Blob([exportProgress(progress, config)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `shape-first-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage('Backup downloaded.')
  }

  const readFile = async (file?: File) => {
    if (!file) return
    try {
      const imported = importProgress(await file.text())
      onImport(imported.progress, imported.config)
      setMessage('Progress restored from backup.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not read this backup.')
    }
  }

  return (
    <main className="page settings-page">
      <div className="page-heading">
        <p className="eyebrow">LOCAL BY DESIGN</p>
        <h1>Your practice stays here.</h1>
        <p>There is no account or cloud database. Export a backup before clearing browser data or changing devices.</p>
      </div>
      <section className="panel settings-panel">
        <div className="setting-row">
          <div><h2>Export progress</h2><p>Download your attempts, mastery map and current practice filters.</p></div>
          <button className="secondary-button" onClick={download}>Download JSON</button>
        </div>
        <div className="setting-row">
          <div><h2>Import progress</h2><p>Restore a Shape First JSON backup. This replaces progress on this device.</p></div>
          <input ref={inputRef} type="file" accept="application/json" hidden onChange={(event) => void readFile(event.target.files?.[0])} />
          <button className="secondary-button" onClick={() => inputRef.current?.click()}>Choose backup</button>
        </div>
        <div className="setting-row danger-row">
          <div><h2>Reset all data</h2><p>Delete every saved attempt and mastery score from this browser.</p></div>
          {!confirmReset ? <button className="danger-button" onClick={() => setConfirmReset(true)}>Reset…</button> : (
            <div className="confirm-actions"><button onClick={() => setConfirmReset(false)}>Cancel</button><button className="danger-button" onClick={() => { onReset(); setConfirmReset(false); setMessage('Local progress reset.') }}>Confirm reset</button></div>
          )}
        </div>
      </section>
      <section className="panel offline-panel">
        <div className="offline-icon">↓</div>
        <div><h2>Install for offline practice</h2><p>Use your browser’s “Add to Home Screen” or “Install App” command. Once loaded, the trainer works without a network connection.</p></div>
      </section>
      {message && <div className="toast" role="status">{message}</div>}
    </main>
  )
}

