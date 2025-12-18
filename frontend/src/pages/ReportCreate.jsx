import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'react-toastify'
import axios from 'axios'

const ReportCreate = () => {
    const { user } = useAuth()
    const navigate = useNavigate()

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        location: '',
        category: 'OTHER',
        priority: 'MEDIUM',
        imageUrl: ''
    })
    const [loading, setLoading] = useState(false)

    const categories = [
        { value: 'FURNITURE', label: 'Furniture' },
        { value: 'ELECTRONIC', label: 'Elektronik' },
        { value: 'BUILDING', label: 'Bangunan' },
        { value: 'SANITARY', label: 'Sanitasi' },
        { value: 'OTHER', label: 'Lainnya' }
    ]

    const priorities = [
        { value: 'LOW', label: 'Rendah' },
        { value: 'MEDIUM', label: 'Sedang' },
        { value: 'HIGH', label: 'Tinggi' },
        { value: 'URGENT', label: 'Mendesak' }
    ]

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.title || !formData.description || !formData.location) {
            toast.error('Judul, deskripsi, dan lokasi harus diisi')
            return
        }

        setLoading(true)

        try {
            const response = await axios.post('/reports', formData)

            if (response.data.success) {
                toast.success('Laporan berhasil dibuat!')
                navigate('/reports')
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal membuat laporan')
        } finally {
            setLoading(false)
        }
    }

    if (user?.role !== 'STUDENT') {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600">Hanya mahasiswa yang dapat membuat laporan.</p>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Buat Laporan Baru</h1>
                <p className="text-gray-600 mt-2">Laporkan kerusakan barang di lingkungan kampus</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="card p-6 space-y-6">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                            Judul Laporan *
                        </label>
                        <input
                            id="title"
                            name="title"
                            type="text"
                            required
                            value={formData.title}
                            onChange={handleChange}
                            className="input-primary mt-1"
                            placeholder="Contoh: Kursi rusak di Lab Komputer"
                        />
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Deskripsi Kerusakan *
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            rows="4"
                            required
                            value={formData.description}
                            onChange={handleChange}
                            className="input-primary mt-1"
                            placeholder="Jelaskan secara detail kerusakan yang ditemukan..."
                        />
                    </div>

                    <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                            Lokasi *
                        </label>
                        <input
                            id="location"
                            name="location"
                            type="text"
                            required
                            value={formData.location}
                            onChange={handleChange}
                            className="input-primary mt-1"
                            placeholder="Contoh: Gedung A, Lantai 2, Ruang 201"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                                Kategori
                            </label>
                            <select
                                id="category"
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="input-primary mt-1"
                            >
                                {categories.map((category) => (
                                    <option key={category.value} value={category.value}>
                                        {category.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                                Prioritas
                            </label>
                            <select
                                id="priority"
                                name="priority"
                                value={formData.priority}
                                onChange={handleChange}
                                className="input-primary mt-1"
                            >
                                {priorities.map((priority) => (
                                    <option key={priority.value} value={priority.value}>
                                        {priority.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">
                            URL Gambar (Opsional)
                        </label>
                        <input
                            id="imageUrl"
                            name="imageUrl"
                            type="url"
                            value={formData.imageUrl}
                            onChange={handleChange}
                            className="input-primary mt-1"
                            placeholder="https://example.com/image.jpg"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Link gambar dari layanan penyimpanan cloud (Google Drive, Imgur, dll.)
                        </p>
                    </div>

                    <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={() => navigate('/reports')}
                            className="btn-secondary"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Menyimpan...' : 'Kirim Laporan'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}

export default ReportCreate