# Shape First

A mobile-first piano harmony trainer that teaches chord derivation before asking for instant recognition. The core path is: construct a triad from interval structure, recognise it in root position, invert it, spread it, and finally collapse a one-bar left-hand arpeggio into one harmonic object.

## Run locally

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

Other useful commands:

```bash
npm test
npm run build
npm run preview
```

## Deploy to GitHub Pages

1. Push this project to a GitHub repository whose default branch is `main`.
2. Open **Settings → Pages** and choose **GitHub Actions** as the source.
3. Push to `main`, or manually run the **Test and deploy Shape First** workflow.

The Vite build uses relative asset paths, so both a root Pages site and a repository subpath work without editing the project name.

## Data and offline use

There is no backend or account. Practice history and the weakness model live in browser `localStorage`. The Settings screen can export and restore a JSON backup. The generated service worker precaches the app after the first visit; install it with the browser’s **Add to Home Screen** or **Install App** command.

## Training model

- **Build the Chord** derives the 3rd and 5th from a supplied root and quality. The UI requires the letter name before the accidental and offers progressive, non-revealing hints.
- **Interval Lab** focuses only on major 3rds, minor 3rds, and perfect 5ths, and always explains how the interval functions inside a chord.
- **Learning Mode** adds retry-without-reveal, root testing, stacked-third reordering, bass/root separation, and reasoning-first feedback.
- **Instant Recognition** flashes the notation briefly and removes pre-answer help. It is always available; construction competence influences recommendations but never locks a mode.
- Recognition progresses through root-position blocks, close inversions, spread voicings, and one-bar arpeggios. **In Key** can add major-key signatures and Roman numerals.
- Adaptive selection draws 70% from weak skills, 20% from review-due skills, and 10% from unseen material while avoiding exact recent repeats. Construction mistakes distinguish letter-distance, accidental, and interval errors.
- Mastery is stored separately for chord structure, useful intervals, spelling method, learning phase, roots, qualities, inversions, patterns, keys, and scale degrees. Guided answers receive partial—not fluent—mastery credit.

The app intentionally has no MIDI input: the task is to derive and recognise the harmony before playing it. Seventh chords remain out of scope until triads are fluent.
