import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const AuthLayout = () => {
    const { isAuthenticated, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    if (isAuthenticated) {
        return <Navigate to="/dashboard" />
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
                    <div className="w-full max-w-md">
                        <div className="text-center mb-8">
                            <img
                                src="/logo.webp"
                                alt="CivitasFix"
                                className="h-16 w-16 mx-auto mb-4"
                            />
                            <h1 className="text-3xl font-bold text-gray-900">CivitasFix</h1>
                            <p className="text-gray-600 mt-2">Laporan Kerusakan Kampus</p>
                        </div>
                        <div className="bg-white rounded-2xl shadow-lg p-8">
                            <Outlet />
                        </div>
                        <p className="text-center text-gray-600 mt-6 text-sm">
                            &copy; {new Date().getFullYear()} CivitasFix. Semua hak dilindungi.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AuthLayout