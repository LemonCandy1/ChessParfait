import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Challenge_Rulette from './pages/Challenge_Rulette';
import TrainingPuzzles from './pages/TrainingPuzzles';
import ImposterChess from './pages/ImposterChess';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/Challenge_Rulette" element={<Challenge_Rulette />} />
        <Route path="/TrainingPuzzles" element={<TrainingPuzzles />} />
        <Route path="/ImposterChess" element={<ImposterChess />} />
      </Routes>
    </BrowserRouter>
  );
}