import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Challenge_Rulette from './pages/Challenge_Rulette';
console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/Challenge_Rulette" element={<Challenge_Rulette />} />
      </Routes>
    </BrowserRouter>
  );
}