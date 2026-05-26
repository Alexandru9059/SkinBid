import { Link } from 'react-router-dom'
import CountdownTimer from './CountdownTimer'

const RARITY_COLORS = {
  Consumer: 'text-gray-400 border-gray-600',
  Industrial: 'text-sky-300 border-sky-700',
  'Mil-Spec': 'text-blue-400 border-blue-700',
  Restricted: 'text-purple-400 border-purple-700',
  Classified: 'text-pink-400 border-pink-700',
  Covert: 'text-red-400 border-red-700',
  Contraband: 'text-yellow-400 border-yellow-600',
}

const GAME_ICONS = {
  CS2: '🔫',
  'Dota 2': '⚔️',
  Valorant: '🎯',
  TF2: '🎩',
}

export default function AuctionCard({ auction }) {
  const rarity = RARITY_COLORS[auction.rarity] || 'text-gray-400 border-gray-600'
  const currentBid = auction.current_bid ? parseFloat(auction.current_bid) : null
  const reserve = parseFloat(auction.reserve_price)

  return (
    <Link to={`/auctions/${auction.id}`}>
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-blue-500 hover:shadow-lg hover:shadow-blue-900/20 transition-all duration-200 cursor-pointer group">
        <div className="h-36 bg-gray-900 flex items-center justify-center text-5xl select-none">
          {GAME_ICONS[auction.game_name] || '🎮'}
        </div>

        <div className="p-4 space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">{auction.game_name}</p>
            <h3 className="text-sm font-semibold text-white leading-tight group-hover:text-blue-300 transition-colors line-clamp-2">
              {auction.item_type_name}
            </h3>
          </div>

          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium border rounded px-1.5 py-0.5 ${rarity}`}>
              {auction.rarity}
            </span>
            {auction.exterior && (
              <span className="text-xs text-gray-500">{auction.exterior}</span>
            )}
          </div>

          <div className="border-t border-gray-700 pt-3">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-gray-500">
                  {currentBid ? 'Current bid' : 'Reserve price'}
                </p>
                <p className="text-lg font-bold text-white">
                  ${(currentBid ?? reserve).toFixed(2)}
                </p>
                {currentBid && (
                  <p className="text-xs text-gray-600">Reserve: ${reserve.toFixed(2)}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-0.5">{auction.bid_count} bids</p>
                <CountdownTimer endAt={auction.end_at} className="text-xs" />
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-600 truncate">by {auction.shop_name}</p>
        </div>
      </div>
    </Link>
  )
}
