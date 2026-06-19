import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Analyze from './pages/Analyze'
import Compare from './pages/Compare'
import Deals from './pages/Deals'
import Sectors from './pages/Sectors'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="pt-16">
          <Routes>
            <Route path="/" element={<Analyze />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/sectors" element={<Sectors />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
