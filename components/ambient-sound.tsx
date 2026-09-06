'use client'

import { Music2, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const CLASSICAL_PHRASE = [261.63, 329.63, 392, 523.25, 392, 329.63, 293.66, 349.23]

export function AmbientSound({ startWhenOpen = false }: { startWhenOpen?: boolean }) {
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(0.14)
  const contextRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const timerRef = useRef<number | null>(null)
  const stepRef = useRef(0)
  const autoStartedRef = useRef(false)

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    void contextRef.current?.close()
  }, [])

  useEffect(() => {
    if (startWhenOpen && !autoStartedRef.current) {
      autoStartedRef.current = true
      void togglePlaying()
    }
  }, [startWhenOpen])

  function playTone() {
    const context = contextRef.current
    const gain = gainRef.current
    if (!context || !gain) return
    const now = context.currentTime
    const note = CLASSICAL_PHRASE[stepRef.current % CLASSICAL_PHRASE.length]
    const oscillator = context.createOscillator()
    const envelope = context.createGain()
    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(note, now)
    envelope.gain.setValueAtTime(0.0001, now)
    envelope.gain.exponentialRampToValueAtTime(0.12, now + 0.08)
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 2.3)
    oscillator.connect(envelope).connect(gain)
    oscillator.start(now)
    oscillator.stop(now + 2.4)
    stepRef.current += 1
  }

  async function togglePlaying() {
    if (!contextRef.current) {
      const context = new AudioContext()
      const gain = context.createGain()
      gain.gain.value = muted ? 0 : volume
      gain.connect(context.destination)
      contextRef.current = context
      gainRef.current = gain
      await context.resume()
      playTone()
      timerRef.current = window.setInterval(playTone, 1900)
      setPlaying(true)
      return
    }
    if (playing) {
      await contextRef.current.suspend()
      setPlaying(false)
    } else {
      await contextRef.current.resume()
      setPlaying(true)
    }
  }

  function toggleMuted() {
    const nextMuted = !muted
    setMuted(nextMuted)
    if (gainRef.current) gainRef.current.gain.value = nextMuted ? 0 : volume
  }

  function updateVolume(value: number) {
    setVolume(value)
    if (gainRef.current && !muted) gainRef.current.gain.value = value
  }

  return <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-accent/50 bg-primary/95 p-2 text-primary-foreground shadow-2xl backdrop-blur-md" aria-label="Kontrol musik latar">
    <button type="button" onClick={togglePlaying} className="flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition hover:bg-primary-foreground/10" aria-label={playing ? 'Jeda musik latar' : 'Putar musik latar'}>
      <Music2 size={16} className={playing ? 'animate-pulse text-accent' : 'text-accent'} /> {playing ? 'Jeda' : 'Musik'}
    </button>
    <button type="button" onClick={toggleMuted} className="rounded-full p-2 transition hover:bg-primary-foreground/10" aria-label={muted ? 'Nyalakan suara' : 'Matikan suara'}>
      {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
    </button>
    <label className="sr-only" htmlFor="ambient-volume">Volume musik</label>
    <input id="ambient-volume" type="range" min="0" max="0.3" step="0.01" value={volume} onChange={event => updateVolume(Number(event.target.value))} className="w-16 accent-accent" />
  </div>
}
