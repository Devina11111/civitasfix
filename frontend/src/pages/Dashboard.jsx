import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import axios from 'axios'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js'
import { Bar, Pie } from 'react-chartjs-2'
import {
    DocumentTextIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ArrowTrendingUpIcon,
    UserGroupIcon
} from '@heroicons/react/24/outline'

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
)

const Dashboard = () => {
    const { user } = useAuth()
    const [summary, setSummary] = useState(null)
    const [stats, setStats] = useState(null)
    const [latestReports, setLatestReports] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            const [summaryRes, statsRes, latestRes] = await Promise.all([
                axios.get('/stats/summary'),
                axios.get('/stats/weekly'),
                axios.get('/reports/dashboard/latest')
            ])

            setSummary(summaryRes.data.summary)
            setStats(statsRes.data.stats)
            setLatestReports(latestRes.data.reports)
        } catch (error) {
            toast.error('Gagal memuat data dashboard')
        } finally {
            setLoading(false)
        }
    }

    const statCards = [
        {
            title: 'Total Laporan',
            value: summary?.total || 0,
            icon: DocumentTextIcon,
            color: 'bg-blue-500',
            textColor: 'text-blue-600',
            bgColor: 'bg-blue-50'
        },
        {
            title: 'Menunggu',
            value: summary?.pending || 0,
            icon: ClockIcon,
            color: 'bg-yellow-500',
            textColor: 'text-yellow-600',
            bgColor: 'bg-yellow-50'
        },
        {
            title: 'Dalam Proses',
            value: summary?.inProgress || 0,
            icon: ExclamationTriangleIcon,
            color: 'bg-orange-500',
            textColor: 'text-orange-600',
            bgColor: 'bg-orange-50'
        },
        {
            title: 'Selesai',
            value: summary?.completed || 0,
            icon: CheckCircleIcon,
            color: 'bg-green-500',
            textColor: 'text-green-600',
            bgColor: 'bg-green-50'
        },
        {
            title: 'Minggu Ini',
            value: summary?.weekly || 0,
            icon: ArrowTrendingUpIcon,
            color: 'bg-purple-500',
            textColor: 'text-purple-600',
            bgColor: 'bg-purple-50'
        },
        {
            title: 'Bulan Ini',
            value: summary?.monthly || 0,
            icon: UserGroupIcon,
            color: 'bg-indigo-500',
            textColor: 'text-indigo-600',
            bgColor: 'bg-indigo-50'
        }
    ]

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
        },
    }

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-600">Ringkasan aktivitas CivitasFix</p>
                </div>
                {user?.role === 'STUDENT' && (
                    <Link to="/reports/create" className="btn-primary">
                        Buat Laporan Baru
                    </Link>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {statCards.map((stat, index) => (
                    <div key={index} className="card p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                            </div>
                            <div className={`p-3 rounded-full ${stat.bgColor}`}>
                                <stat.icon className={`h-6 w-6 ${stat.textColor}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            {user?.role === 'LECTURER' && stats && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Laporan 7 Hari Terakhir</h3>
                        <div className="h-64">
                            <Bar
                                options={chartOptions}
                                data={{
                                    labels: stats.dailyCounts.map(d => d.date),
                                    datasets: [
                                        {
                                            label: 'Jumlah Laporan',
                                            data: stats.dailyCounts.map(d => d.count),
                                            backgroundColor: 'rgba(34, 197, 94, 0.5)',
                                            borderColor: 'rgb(34, 197, 94)',
                                            borderWidth: 1
                                        }
                                    ]
                                }}
                            />
                        </div>
                    </div>

                    <div className="card p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Laporan</h3>
                        <div className="h-64">
                            <Pie
                                options={chartOptions}
                                data={{
                                    labels: Object.keys(stats.byStatus || {}),
                                    datasets: [
                                        {
                                            data: Object.values(stats.byStatus || {}),
                                            backgroundColor: [
                                                'rgba(255, 99, 132, 0.5)',
                                                'rgba(54, 162, 235, 0.5)',
                                                'rgba(255, 206, 86, 0.5)',
                                                'rgba(75, 192, 192, 0.5)',
                                                'rgba(153, 102, 255, 0.5)'
                                            ],
                                            borderColor: [
                                                'rgb(255, 99, 132)',
                                                'rgb(54, 162, 235)',
                                                'rgb(255, 206, 86)',
                                                'rgb(75, 192, 192)',
                                                'rgb(153, 102, 255)'
                                            ],
                                            borderWidth: 1
                                        }
                                    ]
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Latest Reports */}
            <div className="card">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Laporan Terbaru</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Judul
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Lokasi
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tanggal
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Aksi
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {latestReports.map((report) => (
                                <tr key={report.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{report.title}</div>
                                        <div className="text-sm text-gray-500">{report.category}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{report.location}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${report.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                report.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                                                    report.status === 'PENDING' ? 'bg-gray-100 text-gray-800' :
                                                        'bg-blue-100 text-blue-800'
                                            }`}>
                                            {report.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(report.createdAt).toLocaleDateString('id-ID')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <Link
                                            to={`/reports/${report.id}`}
                                            className="text-primary-600 hover:text-primary-900"
                                        >
                                            Lihat
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default Dashboard