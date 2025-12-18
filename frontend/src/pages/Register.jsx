import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'react-toastify'

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'STUDENT',
        nim: '',
        nidn: ''
    })
    const [loading, setLoading] = useState(false)
    const { register } = useAuth()
    const navigate = useNavigate()

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (formData.password !== formData.confirmPassword) {
            toast.error('Password dan konfirmasi password tidak cocok')
            return
        }

        if (formData.password.length < 6) {
            toast.error('Password minimal 6 karakter')
            return
        }

        setLoading(true)

        try {
            const userData = {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: formData.role,
                ...(formData.role === 'STUDENT' && { nim: formData.nim }),
                ...(formData.role === 'LECTURER' && { nidn: formData.nidn })
            }

            const response = await register(userData)

            if (response.success) {
                toast.success('Registrasi berhasil! Silakan cek email untuk verifikasi.')
                navigate('/verify', { state: { email: formData.email } })
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registrasi gagal')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Buat Akun Baru</h2>
                <p className="text-gray-600 mt-2">Bergabung dengan CivitasFix</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Nama Lengkap
                    </label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="input-primary mt-1"
                        placeholder="John Doe"
                    />
                </div>

                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="input-primary mt-1"
                        placeholder="email@example.com"
                    />
                </div>

                <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                        Peran
                    </label>
                    <select
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="input-primary mt-1"
                    >
                        <option value="STUDENT">Mahasiswa</option>
                        <option value="LECTURER">Dosen</option>
                    </select>
                </div>

                {formData.role === 'STUDENT' && (
                    <div>
                        <label htmlFor="nim" className="block text-sm font-medium text-gray-700">
                            NIM
                        </label>
                        <input
                            id="nim"
                            name="nim"
                            type="text"
                            required
                            value={formData.nim}
                            onChange={handleChange}
                            className="input-primary mt-1"
                            placeholder="12345678"
                        />
                    </div>
                )}

                {formData.role === 'LECTURER' && (
                    <div>
                        <label htmlFor="nidn" className="block text-sm font-medium text-gray-700">
                            NIDN
                        </label>
                        <input
                            id="nidn"
                            name="nidn"
                            type="text"
                            required
                            value={formData.nidn}
                            onChange={handleChange}
                            className="input-primary mt-1"
                            placeholder="01234567"
                        />
                    </div>
                )}

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="input-primary mt-1"
                        placeholder="••••••••"
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimal 6 karakter</p>
                </div>

                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                        Konfirmasi Password
                    </label>
                    <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="input-primary mt-1"
                        placeholder="••••••••"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Memproses...' : 'Daftar'}
                </button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                    Sudah punya akun?{' '}
                    <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                        Masuk di sini
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default Register