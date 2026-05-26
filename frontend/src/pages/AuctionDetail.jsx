import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getAuction, endAuction, confirmAuction } from '../api'
import CountdownTimer from '../components/CountdownTimer'
import BidForm from '../components/BidForm'
import BidList from '../components/BidList'

const RARITY_COLORS = {
  Consumer: 'bg-gray-700 text-gray-300',
  Industrial: 'bg-sky-900 text-sky-300',
  'Mil-Spec': 'bg-blue-900 text-blue-300',
  Restricted: 'bg-purple-900 text-purple-300',
  Classified: 'bg-pink-900 text-pink-300',
  Covert: 'bg-red-900 text-red-300',
  Contraband: 'bg-yellow-900 text-yellow-300',
}

export default function AuctionDetail() {
  const { id } = useParams()
  const [auction, setAuction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionMsg, setActionMsg] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    getAuction(id)
      .then((data) => { setAuction(data); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleEnd() {
    try {
      await endAuction(id)
      setActionMsg('Auction ended.')
      load()
    } catch (err) {
      setActionMsg(`Error: ${err.message}`)
    }
  }

  async function handleConfirm(action) {
    try {
      const res = await confirmAuction(id, action)
      setActionMsg(`Sale ${res.status}.`)
      load()
    } catch (err) {
      setActionMsg(`Error: ${err.message}`)
    }
  }

  if (loading) return <div className="text-gray-500 py-12 text-center">Loading…</div>
  if (error) return <div className="text-red-400 py-4">Error: {error}</div>
  if (!auction) return null

  const currentBid = auction.current_bid ? parseFloat(auction.current_bid) : null
  const reserve = parseFloat(auction.reserve_price)
  const rarityClass = RARITY_COLORS[auction.rarity] || 'bg-gray-700 text-gray-300'

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/" className="hover:text-white">Auctions</Link>
        <span>/</span>
        <span className="text-gray-300">{auction.item_type_name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-5">
          <div className="bg-gray-800 border border-gray-700 rounded-xl h-64 flex items-center justify-center text-8xl">
            🎮
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">{auction.game_name}</p>
              <h1 className="text-2xl font-bold text-white">{auction.item_type_name}</h1>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${rarityClass}`}>
                {auction.rarity}
              </span>
              {auction.exterior && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                  {auction.exterior}
                </span>
              )}
            </div>

            {auction.float_val && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Float value</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gradient-to-r from-green-500 via-yellow-400 to-red-500 rounded-full relative">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-gray-900 shadow"
                      style={{ left: `${parseFloat(auction.float_val) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 font-mono">
                    {parseFloat(auction.float_val).toFixed(8)}
                  </span>
                </div>
              </div>
            )}

            <Link
              to={`/shops/${auction.shop_id}`}
              className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300"
            >
              <span>by {auction.shop_name}</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <div className={`rounded-xl p-4 text-center ${
            auction.status === 'active' ? 'bg-green-900/30 border border-green-700' :
            auction.status === 'ended' ? 'bg-yellow-900/30 border border-yellow-700' :
            auction.status === 'confirmed' ? 'bg-blue-900/30 border border-blue-700' :
            'bg-gray-800 border border-gray-700'
          }`}>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
              {auction.status === 'active' ? 'Ends in' : 'Status'}
            </p>
            {auction.status === 'active' ? (
              <CountdownTimer endAt={auction.end_at} className="text-3xl" />
            ) : (
              <p className="text-xl font-semibold capitalize text-white">{auction.status}</p>
            )}
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-500">Current bid</p>
                <p className="text-3xl font-bold text-white">
                  {currentBid ? `$${currentBid.toFixed(2)}` : '—'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Reserve</p>
                <p className="text-lg text-gray-400">${reserve.toFixed(2)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">{auction.bid_count} bids placed</p>
          </div>

          {auction.transaction && (
            <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-4 space-y-1">
              <p className="text-sm font-semibold text-blue-300">Sale Confirmed</p>
              <p className="text-lg font-bold text-white">
                ${parseFloat(auction.transaction.final_price).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(auction.transaction.confirmed_at).toLocaleString()}
              </p>
            </div>
          )}

          {auction.status === 'active' && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Place a Bid</h3>
              <BidForm auction={auction} onBidPlaced={load} />
            </div>
          )}

          <div className="space-y-2">
            {actionMsg && (
              <p className="text-xs text-gray-400 text-center">{actionMsg}</p>
            )}
            {auction.status === 'active' && (
              <button
                onClick={handleEnd}
                className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium py-2 rounded-lg transition-colors"
              >
                End Auction (Shop)
              </button>
            )}
            {auction.status === 'ended' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleConfirm('confirm')}
                  className="flex-1 bg-green-700 hover:bg-green-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  Confirm Sale
                </button>
                <button
                  onClick={() => handleConfirm('reject')}
                  className="flex-1 bg-red-900 hover:bg-red-800 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  Reject Sale
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Bid History</h2>
        <BidList bids={auction.bids} />
      </div>
    </div>
  )
}
