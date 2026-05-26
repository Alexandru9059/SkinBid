import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import AuctionDetail from './pages/AuctionDetail'
import ShopPage from './pages/ShopPage'
import Analytics from './pages/Analytics'
import { getUser } from './api'

export const UserContext = createContext(null)

export function useUser() {
  return useContext(UserContext)
}

export default function App() {
  const [userId, setUserId] = useState(21)
  const [user, setUser] = useState(null)

  useEffect(() => {
    getUser(userId)
      .then(setUser)
      .catch(() => setUser(null))
  }, [userId])

  return (
    <UserContext.Provider value={{ user, userId, setUserId }}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-950 text-gray-100">
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auctions/:id" element={<AuctionDetail />} />
              <Route path="/shops/:id" element={<ShopPage />} />
              <Route path="/analytics" element={<Analytics />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </UserContext.Provider>
  )
}
