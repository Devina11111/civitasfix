import { Link } from 'react-router-dom'

const NotFound = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-9xl font-bold text-primary-600">404</h1>
                <h2 className="text-3xl font-bold text-gray-900 mt-4">Halaman Tidak Ditemukan</h2>
                <p className="text-gray-600 mt-2">
                    Maaf, halaman yang Anda cari tidak ditemukan atau telah dipindahkan.
                </p>
                <div className="mt-8">
                    <Link to="/" className="btn-primary">
                        Kembali ke Dashboard
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default NotFound