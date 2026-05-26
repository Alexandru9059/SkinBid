import { useState, useEffect } from 'react'
import { getTopItems, getShopRevenue, getPriceTrend, getItemTypes } from '../api'

function Table({ columns, rows, emptyMsg = 'No data.' }) {
  if (!rows || rows.length === 0) {
    return <p className="text-gray-500 text-sm py-4">{emptyMsg}</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
            {columns.map((c) => (
              <th key={c.key} className="pb-2 pr-4 font-medium">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-800/30">
              {columns.map((c) => (
                <td key={c.key} className="py-2.5 pr-4 text-gray-300">
                  {c.format ? c.format(row[c.key], row) : (row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const RARITY_COLORS = {
  Consumer: 'text-gray-400', Industrial: 'text-sky-300', 'Mil-Spec': 'text-blue-400',
  Restricted: 'text-purple-400', Classified: 'text-pink-400',
  Covert: 'text-red-400', Contraband: 'text-yellow-400',
}

export default function Analytics() {
  const [topItems, setTopItems] = useState(null)
  const [shopRevenue, setShopRevenue] = useState(null)
  const [priceTrend, setPriceTrend] = useState(null)
  const [itemTypes, setItemTypes] = useState([])
  const [selectedType, setSelectedType] = useState('')

  useEffect(() => {
    getTopItems().then(setTopItems).catch(() => setTopItems([]))
    getShopRevenue().then(setShopRevenue).catch(() => setShopRevenue([]))
    getItemTypes().then(setItemTypes).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedType) { setPriceTrend(null); return }
    getPriceTrend(selectedType).then(setPriceTrend).catch(() => setPriceTrend([]))
  }, [selectedType])

  return (
    <div className="space-y-10 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Live queries against the SkinBid database</p>
      </div>

      <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Query 1 — Top 5 Most Bid-On Item Types
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Which items generated the most bidding activity in the last 30 days?
          </p>
          <code className="block mt-2 text-xs text-gray-400 bg-gray-900 rounded p-3 font-mono whitespace-pre">
{`SELECT it.name, g.name AS game, it.rarity,
       COUNT(b.id) AS total_bids,
       ROUND(AVG(b.amount), 2) AS avg_bid_amount,
       MAX(b.amount) AS highest_bid
FROM bids b
JOIN auctions a ON b.auction_id = a.id ...
WHERE b.placed_at >= NOW() - INTERVAL '30 days'
GROUP BY it.id ORDER BY total_bids DESC LIMIT 5`}
          </code>
        </div>
        {topItems === null ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : (
          <Table
            rows={topItems}
            columns={[
              { key: 'item_type', label: 'Item Type' },
              { key: 'game', label: 'Game' },
              {
                key: 'rarity', label: 'Rarity',
                format: (v) => <span className={RARITY_COLORS[v] || ''}>{v}</span>,
              },
              { key: 'total_bids', label: 'Total Bids' },
              { key: 'avg_bid_amount', label: 'Avg Bid', format: (v) => `$${v}` },
              { key: 'highest_bid', label: 'Highest Bid', format: (v) => `$${v}` },
            ]}
            emptyMsg="No bids in the last 30 days."
          />
        )}
      </section>

      <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Query 2 — Shop Revenue Leaderboard
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Which shops generated the most revenue from confirmed sales in the last 30 days?
          </p>
          <code className="block mt-2 text-xs text-gray-400 bg-gray-900 rounded p-3 font-mono whitespace-pre">
{`SELECT s.name, s.verified,
       COUNT(t.id) AS total_sales,
       SUM(t.final_price) AS total_revenue,
       ROUND(AVG(t.final_price), 2) AS avg_sale_price
FROM transactions t JOIN shops s ON t.shop_id = s.id
WHERE t.confirmed_at >= NOW() - INTERVAL '30 days'
GROUP BY s.id ORDER BY total_revenue DESC`}
          </code>
        </div>
        {shopRevenue === null ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : (
          <Table
            rows={shopRevenue}
            columns={[
              { key: 'shop_name', label: 'Shop' },
              {
                key: 'verified', label: 'Verified',
                format: (v) => v ? <span className="text-blue-400">✓ Yes</span> : <span className="text-gray-500">No</span>,
              },
              { key: 'total_sales', label: 'Sales' },
              { key: 'total_revenue', label: 'Revenue', format: (v) => `$${parseFloat(v).toFixed(2)}` },
              { key: 'avg_sale_price', label: 'Avg Price', format: (v) => `$${v}` },
            ]}
            emptyMsg="No confirmed sales in the last 30 days."
          />
        )}
      </section>

      <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Query 3 — Price Trend by Item Type
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Weekly average winning bid for a specific item type over the last 6 months.
          </p>
          <code className="block mt-2 text-xs text-gray-400 bg-gray-900 rounded p-3 font-mono whitespace-pre">
{`SELECT DATE_TRUNC('week', t.confirmed_at) AS week,
       it.name, COUNT(t.id) AS sales_count,
       ROUND(AVG(t.final_price), 2) AS avg_price
FROM transactions t ...
WHERE it.id = :item_type_id
  AND t.confirmed_at >= NOW() - INTERVAL '6 months'
GROUP BY week, it.name ORDER BY week ASC`}
          </code>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Select item type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 w-72 outline-none focus:border-blue-500"
          >
            <option value="">— choose an item type —</option>
            {itemTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.rarity})</option>
            ))}
          </select>
        </div>

        {selectedType && priceTrend === null && (
          <p className="text-gray-500 text-sm">Loading…</p>
        )}
        {priceTrend && (
          <Table
            rows={priceTrend.map((r) => ({
              ...r,
              week: new Date(r.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            }))}
            columns={[
              { key: 'week', label: 'Week' },
              { key: 'sales_count', label: 'Sales' },
              { key: 'avg_price', label: 'Avg Price', format: (v) => `$${v}` },
              { key: 'min_price', label: 'Min', format: (v) => `$${v}` },
              { key: 'max_price', label: 'Max', format: (v) => `$${v}` },
            ]}
            emptyMsg="No confirmed sales found for this item type in the last 6 months."
          />
        )}
      </section>
    </div>
  )
}
