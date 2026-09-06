'use client'

import { Music2, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const AUDIO_SRC = '/audio/spirit-of-bali.mp3'

export function AmbientSound({ startWhenOpen = false }: { startWhenOpen?: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const autoStartedRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(0.14)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
    audio.muted = muted
  }, [muted, volume])

  useEffect(() => () => {
    const audio = audioRef.current
    audio?.pause()
    if (audio) audio.currentTime = 0
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

  function toggleMuted() {
    setMuted(current => !current)
  }

  function updateVolume(value: number) {
    setVolume(value)
    if (value > 0 && muted) setMuted(false)
  }

  return (
    <>
      <audio ref={audioRef} src={AUDIO_SRC} loop preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-accent/50 bg-primary/95 p-2 text-primary-foreground shadow-2xl backdrop-blur-md" aria-label="Kontrol musik latar">
        <button type="button" onClick={togglePlaying} className="flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition hover:bg-primary-foreground/10" aria-label={playing ? 'Jeda musik latar' : 'Putar musik latar'}>
          <Music2 size={16} className={playing ? 'animate-pulse text-accent' : 'text-accent'} /> {playing ? 'Jeda' : 'Musik'}
        </button>
        <button type="button" onClick={toggleMuted} className="rounded-full p-2 transition hover:bg-primary-foreground/10" aria-label={muted ? 'Nyalakan suara' : 'Matikan suara'}>
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <label className="sr-only" htmlFor="ambient-volume">Volume musik</label>
        <input id="ambient-volume" type="range" min="0" max="0.3" step="0.01" value={volume} onChange={event => updateVolume(Number(event.target.value))} className="w-16 accent-accent" />
      </div>
    </>
  )
}
