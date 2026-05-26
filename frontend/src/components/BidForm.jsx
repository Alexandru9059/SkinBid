import { useState } from 'react'
import { placeBid } from '../api'
import { useUser } from '../App'

export default function BidForm({ auction, onBidPlaced }) {
  const { userId } = useUser()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const minBid = Math.max(
    parseFloat(auction.reserve_price),
    auction.current_bid ? parseFloat(auction.current_bid) + 0.01 : 0
  )

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const value = parseFloat(amount)
    if (isNaN(value) || value <= 0) {
      setError('Enter a valid amount')
      return
    }

    setLoading(true)
    try {
      await placeBid(auction.id, userId, value)
      setSuccess(true)
      setAmount('')
      onBidPlaced?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Your bid (min ${minBid.toFixed(2)})
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              step="0.01"
              min={minBid}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={minBid.toFixed(2)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? '…' : 'Bid'}
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}
      {success && <p className="text-green-400 text-xs">Bid placed successfully!</p>}
    </form>
  )
}
