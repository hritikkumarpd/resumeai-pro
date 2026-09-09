import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Navbar   from './components/layout/Navbar'
import Footer   from './components/layout/Footer'
import Home     from './pages/Home'
import Login    from './pages/Login'
import Dashboard    from './pages/Dashboard'
import Builder      from './pages/Builder'
import Templates    from './pages/Templates'
import AtsChecker   from './pages/AtsChecker'
import CoverLetter  from './pages/CoverLetter'
import Pricing      from './pages/Pricing'
import './App.css'

/* ── Protected Route ────────────────────────────────────────── */
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full"
               style={{ border: '3px solid rgba(124,58,237,.2)', borderTopColor: '#7C3AED', animation: 'spin 0.8s linear infinite' }} />
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

/* ── Public Route (redirect if logged in) ───────────────────── */
function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />
}

/* ── Layout wrappers ────────────────────────────────────────── */
function WithNav({ children }) {
  return <>
    <Navbar />
    {children}
    <Footer />
  </>
}

function WithNavNoFooter({ children }) {
  return <>
    <Navbar />
    {children}
  </>
}

/* ── App ────────────────────────────────────────────────────── */
function AppRoutes() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/" element={<WithNav><Home /></WithNav>} />
      <Route path="/templates"    element={<WithNav><Templates /></WithNav>} />
      <Route path="/pricing"      element={<WithNav><Pricing /></WithNav>} />

      {/* Auth (redirect if already logged in) */}
      <Route path="/login" element={
        <PublicOnlyRoute><Login /></PublicOnlyRoute>
      } />

      {/* Protected pages */}
      <Route path="/dashboard" element={
        <ProtectedRoute><WithNavNoFooter><Dashboard /></WithNavNoFooter></ProtectedRoute>
      } />
      <Route path="/builder" element={
        <ProtectedRoute><WithNavNoFooter><Builder /></WithNavNoFooter></ProtectedRoute>
      } />
      <Route path="/builder/:id" element={
        <ProtectedRoute><WithNavNoFooter><Builder /></WithNavNoFooter></ProtectedRoute>
      } />
      <Route path="/ats-checker" element={
        <ProtectedRoute><WithNav><AtsChecker /></WithNav></ProtectedRoute>
      } />
      <Route path="/cover-letter" element={
        <ProtectedRoute><WithNav><CoverLetter /></WithNav></ProtectedRoute>
      } />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
