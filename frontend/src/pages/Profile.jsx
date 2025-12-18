import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'react-toastify'
import axios from 'axios'

const Profile = () => {
    const { user } = useAuth()
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        nim: '',
        nidn: ''
    })
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [changingPassword, setChangingPassword] = useState(false)

    useEffect(() => {
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        try {
            const response = await axios.get('/users/profile')
            setProfile(response.data.user)
            setFormData({
                name: response.data.user.name,
                nim: response.data.user.nim || '',
                nidn: response.data.user.nidn || ''
            })
        } catch (error) {
            toast.error('Gagal memuat profil')
        } finally {
            setLoading(false)
        }
    }

    const handleProfileChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handlePasswordChange = (e) => {
        const { name, value } = e.target
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleProfileSubmit = async (e) => {
        e.preventDefault()

        try {
            const response = await axios.put('/users/profile', formData)

            if (response.data.success) {
                toast.success('Profil berhasil diperbarui')
                setProfile(response.data.user)
                setEditing(false)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal memperbarui profil')
        }
    }

    const handlePasswordSubmit = async (e) => {
        e.preventDefault()

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('Password baru dan konfirmasi tidak cocok')
            return
        }

        if (passwordData.newPassword.length < 6) {
            toast.error('Password baru minimal 6 karakter')
            return
        }

        setChangingPassword(true)

        try {
            const response = await axios.post('/users/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            })

            if (response.data.success) {
                toast.success('Password berhasil diubah')
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                })
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal mengubah password')
        } finally {
            setChangingPassword(false)
        }
    }

    if (loading || !profile) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Profil Pengguna</h1>
                <p className="text-gray-600">Kelola informasi akun Anda</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-gray-900">Informasi Profil</h3>
                            {!editing && (
                                <button
                                    onClick={() => setEditing(true)}
                                    className="text-sm font-medium text-primary-600 hover:text-primary-500"
                                >
                                    Edit
                                </button>
                            )}
                        </div>

                        {editing ? (
                            <form className="space-y-4" onSubmit={handleProfileSubmit}>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nama Lengkap
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleProfileChange}
                                        className="input-primary"
                                        required
                                    />
                                </div>

                                {user?.role === 'STUDENT' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            NIM
                                        </label>
                                        <input
                                            type="text"
                                            name="nim"
                                            value={formData.nim}
                                            onChange={handleProfileChange}
                                            className="input-primary"
                                            required
                                        />
                                    </div>
                                )}

                                {user?.role === 'LECTURER' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            NIDN
                                        </label>
                                        <input
                                            type="text"
                                            name="nidn"
                                            value={formData.nidn}
                                            onChange={handleProfileChange}
                                            className="input-primary"
                                            required
                                        />
                                    </div>
                                )}

                                <div className="flex justify-end space-x-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditing(false)
                                            setFormData({
                                                name: profile.name,
                                                nim: profile.nim || '',
                                                nidn: profile.nidn || ''
                                            })
                                        }}
                                        className="btn-secondary"
                                    >
                                        Batal
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        Simpan Perubahan
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nama</label>
                                    <p className="mt-1 text-gray-900">{profile.name}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email</label>
                                    <p className="mt-1 text-gray-900">{profile.email}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Peran</label>
                                    <p className="mt-1 text-gray-900 capitalize">{profile.role.toLowerCase()}</p>
                                </div>
                                {profile.nim && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">NIM</label>
                                        <p className="mt-1 text-gray-900">{profile.nim}</p>
                                    </div>
                                )}
                                {profile.nidn && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">NIDN</label>
                                        <p className="mt-1 text-gray-900">{profile.nidn}</p>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Terdaftar Sejak</label>
                                    <p className="mt-1 text-gray-900">
                                        {new Date(profile.createdAt).toLocaleDateString('id-ID', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Change Password */}
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Ubah Password</h3>
                        <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Password Saat Ini
                                </label>
                                <input
                                    type="password"
                                    name="currentPassword"
                                    value={passwordData.currentPassword}
                                    onChange={handlePasswordChange}
                                    className="input-primary"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Password Baru
                                </label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    value={passwordData.newPassword}
                                    onChange={handlePasswordChange}
                                    className="input-primary"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">Minimal 6 karakter</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Konfirmasi Password Baru
                                </label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={passwordData.confirmPassword}
                                    onChange={handlePasswordChange}
                                    className="input-primary"
                                    required
                                />
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={changingPassword}
                                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {changingPassword ? 'Mengubah...' : 'Ubah Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Account Status */}
                <div className="space-y-6">
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Akun</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Verifikasi Email</span>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${profile.isVerified
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                    {profile.isVerified ? 'Terverifikasi' : 'Belum Terverifikasi'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Status Akun</span>
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                    Aktif
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistik Singkat</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Total Laporan</span>
                                <span className="text-sm font-semibold text-gray-900">
                                    {profile.totalReports || 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Laporan Aktif</span>
                                <span className="text-sm font-semibold text-gray-900">
                                    {profile.activeReports || 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Laporan Selesai</span>
                                <span className="text-sm font-semibold text-gray-900">
                                    {profile.completedReports || 0}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Profile