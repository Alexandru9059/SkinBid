import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getShop } from '../api'

const STATUS_COLORS = {
  available: 'text-green-400',
  in_auction: 'text-yellow-400',
  sold: 'text-gray-500',
  withdrawn: 'text-red-400',
}

const RARITY_COLORS = {
  Consumer: 'text-gray-400',
  Industrial: 'text-sky-300',
  'Mil-Spec': 'text-blue-400',
  Restricted: 'text-purple-400',
  Classified: 'text-pink-400',
  Covert: 'text-red-400',
  Contraband: 'text-yellow-400',
}

export default function ShopPage() {
  const { id } = useParams()
  const [shop, setShop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    getShop(id).then(setShop).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-gray-500 py-12 text-center">Loading…</div>
  if (!shop) return <div className="text-red-400">Shop not found.</div>

  const statusOptions = ['all', 'available', 'in_auction', 'sold']
  const filtered = filter === 'all' ? shop.inventory : shop.inventory.filter((i) => i.status === filter)

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-white">{shop.name}</h1>
              {shop.verified && (
                <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full font-medium">
                  ✓ Verified
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-yellow-400 text-sm">
              {'★'.repeat(Math.round(parseFloat(shop.rating)))}
              {'☆'.repeat(5 - Math.round(parseFloat(shop.rating)))}
              <span className="text-gray-500 ml-1">{parseFloat(shop.rating).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{shop.total_sales}</p>
              <p className="text-xs text-gray-500">Total Sales</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">
                ${parseFloat(shop.total_revenue).toFixed(0)}
              </p>
              <p className="text-xs text-gray-500">Total Revenue</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{shop.inventory.length}</p>
              <p className="text-xs text-gray-500">Inventory Items</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Inventory</h2>
          <div className="flex gap-1 bg-gray-800 p-1 rounded-lg">
            {statusOptions.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1 text-xs rounded-md capitalize transition-colors ${
                  filter === s ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                <th className="pb-2 pr-4">Item</th>
                <th className="pb-2 pr-4">Game</th>
                <th className="pb-2 pr-4">Rarity</th>
                <th className="pb-2 pr-4">Exterior</th>
                <th className="pb-2 pr-4">Float</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="py-2.5 pr-4 text-white font-medium">{item.item_type_name}</td>
                  <td className="py-2.5 pr-4 text-gray-400">{item.game_name}</td>
                  <td className={`py-2.5 pr-4 ${RARITY_COLORS[item.rarity] || 'text-gray-400'}`}>
                    {item.rarity}
                  </td>
                  <td className="py-2.5 pr-4 text-gray-400">{item.exterior || '—'}</td>
                  <td className="py-2.5 pr-4 text-gray-500 font-mono text-xs">
                    {item.float_val ? parseFloat(item.float_val).toFixed(4) : '—'}
                  </td>
                  <td className={`py-2.5 capitalize ${STATUS_COLORS[item.status] || 'text-gray-400'}`}>
                    {item.status.replace('_', ' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-gray-500 text-sm py-6 text-center">No items match this filter.</p>
          )}
        </div>
      </div>
    </div>
  )
}
