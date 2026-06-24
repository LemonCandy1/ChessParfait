import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Challenge_Rulette from './pages/Challenge_Rulette';
import TrainingPuzzles from './pages/TrainingPuzzles';
import ImposterChess from './pages/ImposterChess';
import PawnGame from './pages/PawnGame';
import PawnGameStrategy from './pages/PawnGameStrategy';
import Contact from './pages/Contact';
import Games from './pages/Games';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import LinkEmail from './pages/LinkEmail';
import Login from './pages/Login';
import SetupProfile from './pages/SetupProfile';
import { AuthProvider } from './context/AuthContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/Challenge_Rulette" element={<Challenge_Rulette />} />
          <Route path="/TrainingPuzzles" element={<TrainingPuzzles />} />
          <Route path="/ImposterChess" element={<ImposterChess />} />
          <Route path="/PawnGame" element={<PawnGame />} />
          <Route path="/PawnGameStrategy" element={<PawnGameStrategy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/games" element={<Games />} />
          <Route path="/login" element={<Login />} />
          <Route path="/setup-profile" element={<SetupProfile />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/link-email" element={<LinkEmail />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </GoogleOAuthProvider>
  );
}