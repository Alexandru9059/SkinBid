export default function BidList({ bids }) {
  if (!bids || bids.length === 0) {
    return <p className="text-gray-500 text-sm">No bids yet. Be the first!</p>
  }

  return (
    <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
      {bids.map((bid, i) => (
        <div
          key={bid.id}
          className={`flex justify-between items-center px-3 py-2 rounded-lg text-sm ${
            bid.is_winner
              ? 'bg-yellow-900/40 border border-yellow-700'
              : i === 0
              ? 'bg-blue-900/30 border border-blue-800'
              : 'bg-gray-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {bid.is_winner && <span className="text-yellow-400 text-xs">👑 Winner</span>}
            <span className="text-gray-300">{bid.username}</span>
          </div>
          <div className="text-right">
            <span className="font-semibold text-white">${parseFloat(bid.amount).toFixed(2)}</span>
            <p className="text-xs text-gray-600">
              {new Date(bid.placed_at).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
