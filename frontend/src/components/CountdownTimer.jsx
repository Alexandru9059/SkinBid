import { useState, useEffect } from 'react'

export default function CountdownTimer({ endAt, className = '' }) {
  const [label, setLabel] = useState('')
  const [urgent, setUrgent] = useState(false)

  useEffect(() => {
    const tick = () => {
      const diff = new Date(endAt) - Date.now()
      if (diff <= 0) {
        setLabel('Ended')
        setUrgent(false)
        return
      }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setUrgent(diff < 3_600_000)
      setLabel(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endAt])

  return (
    <span className={`font-mono ${urgent ? 'text-red-400' : 'text-green-400'} ${className}`}>
      {label}
    </span>
  )
}
