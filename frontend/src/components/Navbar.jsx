import { Link } from 'react-router-dom'
import { useUser } from '../App'

export default function Navbar() {
  const { user, userId, setUserId } = useUser()

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-bold text-blue-400 tracking-tight">
            SkinBid
          </Link>
          <Link to="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            Auctions
          </Link>
          <Link to="/analytics" className="text-sm text-gray-400 hover:text-white transition-colors">
            Analytics
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <span className="text-sm text-gray-400">
              <span className="text-green-400 font-semibold">${parseFloat(user.balance).toFixed(2)}</span>
            </span>
          )}
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5">
            <span className="text-xs text-gray-500">User ID</span>
            <input
              type="number"
              min="1"
              value={userId}
              onChange={(e) => setUserId(Number(e.target.value))}
              className="w-14 bg-transparent text-sm text-white text-right outline-none"
            />
          </div>
          {user && (
            <span className="text-sm text-gray-300 font-medium">{user.username}</span>
          )}
        </div>
      </div>
    </nav>
  )
}
