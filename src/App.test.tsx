import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('app shell', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => cleanup())

  it('offers adaptive and custom practice without an account', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /Read the shape/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continue learning/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Build the Chord.*Derive the 3rd/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Interval Lab/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Build a custom drill/i })).toBeEnabled()
    expect(screen.getByText(/learning decisions on this device/i)).toBeInTheDocument()
  })

  it('keeps Instant Recognition available even with empty local progress', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Build a custom drill/i }))
    expect(screen.getByRole('button', { name: 'Instant Recognition' })).toBeEnabled()
  })
})
