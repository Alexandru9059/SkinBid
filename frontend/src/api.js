const BASE = '/api'

async function json(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const getGames = () => fetch(`${BASE}/games`).then(json)

export const getItemTypes = (gameId) =>
  fetch(`${BASE}/item-types${gameId ? `?game_id=${gameId}` : ''}`).then(json)

export const getAuctions = (params = {}) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null))
  return fetch(`${BASE}/auctions?${q}`).then(json)
}

export const getAuction = (id) => fetch(`${BASE}/auctions/${id}`).then(json)

export const placeBid = (auctionId, userId, amount) =>
  fetch(`${BASE}/auctions/${auctionId}/bids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, amount }),
  }).then(json)

export const endAuction = (id) =>
  fetch(`${BASE}/auctions/${id}/end`, { method: 'POST' }).then(json)

export const confirmAuction = (id, action) =>
  fetch(`${BASE}/auctions/${id}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  }).then(json)

export const createAuction = (data) =>
  fetch(`${BASE}/auctions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(json)

export const getShops = () => fetch(`${BASE}/shops`).then(json)

export const getShop = (id) => fetch(`${BASE}/shops/${id}`).then(json)

export const getUser = (id) => fetch(`${BASE}/users/${id}`).then(json)

export const getTopItems = () => fetch(`${BASE}/analytics/top-items`).then(json)

export const getShopRevenue = () => fetch(`${BASE}/analytics/shop-revenue`).then(json)

export const getPriceTrend = (itemTypeId) =>
  fetch(`${BASE}/analytics/price-trend/${itemTypeId}`).then(json)
