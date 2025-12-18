import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { AuthProvider } from './contexts/AuthContext'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import Verify from './pages/Verify'
import Dashboard from './pages/Dashboard'
import Reports from './pages/Reports'
import ReportCreate from './pages/ReportCreate'
import ReportDetail from './pages/ReportDetail'
import History from './pages/History'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'

// Layouts
import MainLayout from './layouts/MainLayout'
import AuthLayout from './layouts/AuthLayout'

function App() {
    return (
        <Router>
            <AuthProvider>
                <ToastContainer position="top-right" autoClose={3000} />
                <Routes>
                    {/* Auth Routes */}
                    <Route element={<AuthLayout />}>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/verify" element={<Verify />} />
                    </Route>

                    {/* Protected Routes */}
                    <Route element={<MainLayout />}>
                        <Route path="/" element={<Navigate to="/dashboard" />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/reports/create" element={<ReportCreate />} />
                        <Route path="/reports/:id" element={<ReportDetail />} />
                        <Route path="/history" element={<History />} />
                        <Route path="/profile" element={<Profile />} />
                    </Route>

                    {/* 404 */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </AuthProvider>
        </Router>
    )
}

export default App