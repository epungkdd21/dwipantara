'use client'

import { Disc3, Pause, Play, Square, Volume1, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const AUDIO_SRC = '/audio/spirit-of-bali.mp3'

export function AmbientSound({ startWhenOpen = false }: { startWhenOpen?: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const autoStartedRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(0.14)
  const [controlsOpen, setControlsOpen] = useState(false)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
  }, [volume])

  useEffect(() => () => {
    const audio = audioRef.current
    audio?.pause()
    if (audio) audio.currentTime = 0
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
  }, [])

  useEffect(() => {
    if (startWhenOpen && !autoStartedRef.current) {
      autoStartedRef.current = true
      void togglePlaying()
    }
  }, [startWhenOpen])

  async function togglePlaying() {
    const audio = audioRef.current
    if (!audio) return

    if (audio.paused) {
      try {
        await audio.play()
        setPlaying(true)
      } catch {
        setPlaying(false)
      }
    } else {
      audio.pause()
      setPlaying(false)
    }
  }

  function revealControls() {
    setControlsOpen(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => setControlsOpen(false), 3000)
  }

  function stopPlaying() {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setPlaying(false)
    revealControls()
  }

  function changeVolume(amount: number) {
    setVolume(current => Math.min(0.3, Math.max(0, Number((current + amount).toFixed(2)))))
    revealControls()
  }

  return (
    <>
      <audio ref={audioRef} src={AUDIO_SRC} loop preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-accent/50 bg-primary/95 p-2 text-primary-foreground shadow-2xl backdrop-blur-md" aria-label="Kontrol musik latar" onPointerEnter={revealControls} onFocus={revealControls}>
        <button type="button" onClick={() => { revealControls(); void togglePlaying() }} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent/60 bg-secondary text-accent transition hover:bg-accent hover:text-accent-foreground ${playing ? 'animate-spin' : ''}`} aria-label={playing ? 'Jeda musik latar' : 'Putar musik latar'}>
          <Disc3 size={21} />
        </button>
        {controlsOpen && <div className="flex items-center gap-1" role="group" aria-label="Kontrol lanjutan musik">
          <button type="button" onClick={togglePlaying} className="rounded-full p-2 transition hover:bg-primary-foreground/10" aria-label={playing ? 'Jeda musik latar' : 'Putar musik latar'}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
          <button type="button" onClick={stopPlaying} className="rounded-full p-2 transition hover:bg-primary-foreground/10" aria-label="Hentikan musik"><Square size={15} /></button>
          <button type="button" onClick={() => changeVolume(-0.03)} className="rounded-full p-2 transition hover:bg-primary-foreground/10" aria-label="Turunkan volume"><Volume1 size={16} /></button>
          <button type="button" onClick={() => changeVolume(0.03)} className="rounded-full p-2 transition hover:bg-primary-foreground/10" aria-label="Naikkan volume"><Volume2 size={16} /></button>
        </div>}
      </div>
    </>
  )
}
