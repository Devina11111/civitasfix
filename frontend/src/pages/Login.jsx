import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'react-toastify'

const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const result = await login(email, password)

            if (result.requiresVerification) {
                navigate('/verify', { state: { email } })
                toast.info('Email belum terverifikasi. Silakan verifikasi email Anda.')
            } else {
                toast.success('Login berhasil!')
                navigate('/dashboard')
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Login gagal')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Masuk ke Akun Anda</h2>
                <p className="text-gray-600 mt-2">Gunakan email dan password Anda</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-primary mt-1"
                        placeholder="email@example.com"
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-primary mt-1"
                        placeholder="••••••••"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Memproses...' : 'Masuk'}
                </button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                    Belum punya akun?{' '}
                    <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
                        Daftar sekarang
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default Login