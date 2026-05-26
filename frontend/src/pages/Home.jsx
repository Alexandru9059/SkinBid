import { useState, useEffect } from 'react'
import { getGames, getAuctions } from '../api'
import AuctionCard from '../components/AuctionCard'

const STATUSES = ['active', 'ended', 'confirmed', 'cancelled']

export default function Home() {
  const [games, setGames] = useState([])
  const [auctions, setAuctions] = useState([])
  const [selectedGame, setSelectedGame] = useState(null)
  const [selectedStatus, setSelectedStatus] = useState('active')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getGames().then(setGames).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    getAuctions({
      status: selectedStatus,
      game_id: selectedGame,
    })
      .then(setAuctions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [selectedGame, selectedStatus])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Auctions</h1>
        <p className="text-gray-500 text-sm mt-1">
          Bid on rare gaming cosmetics from CS2, Dota 2, Valorant, and TF2
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex gap-1 bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setSelectedGame(null)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              selectedGame === null ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            All Games
          </button>
          {games.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGame(g.id)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                selectedGame === g.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-gray-800 p-1 rounded-lg">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStatus(s)}
              className={`px-3 py-1.5 text-sm rounded-md capitalize transition-colors ${
                selectedStatus === s ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-gray-500 text-sm py-12 text-center">Loading auctions…</div>
      )}
      {error && (
        <div className="text-red-400 text-sm py-4">Error: {error}</div>
      )}
      {!loading && !error && auctions.length === 0 && (
        <div className="text-gray-500 text-sm py-12 text-center">
          No {selectedStatus} auctions found.
        </div>
      )}
      {!loading && !error && auctions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {auctions.map((a) => (
            <AuctionCard key={a.id} auction={a} />
          ))}
        </div>
      )}
    </div>
  )
}
