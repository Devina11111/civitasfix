import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
    HomeIcon,
    DocumentTextIcon,
    PlusCircleIcon,
    ClockIcon,
    UserCircleIcon,
    ChartBarIcon,
    ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'

const Sidebar = () => {
    const { user, logout } = useAuth()

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
        { name: 'Laporan', href: '/reports', icon: DocumentTextIcon },
        { name: 'Buat Laporan', href: '/reports/create', icon: PlusCircleIcon, studentOnly: true },
        { name: 'Riwayat', href: '/history', icon: ClockIcon },
        { name: 'Statistik', href: '/dashboard?tab=stats', icon: ChartBarIcon, lecturerOnly: true },
        { name: 'Profil', href: '/profile', icon: UserCircleIcon },
    ]

    return (
        <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white">
            <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
                <div className="flex items-center flex-shrink-0 px-6">
                    <img className="h-8 w-auto" src="/logo.webp" alt="CivitasFix" />
                    <span className="ml-3 text-xl font-semibold text-gray-900">CivitasFix</span>
                </div>
                <div className="mt-8 flex-1 flex flex-col">
                    <nav className="flex-1 px-4 space-y-1">
                        {navigation.map((item) => {
                            if (item.studentOnly && user?.role !== 'STUDENT') return null
                            if (item.lecturerOnly && user?.role !== 'LECTURER') return null

                            return (
                                <NavLink
                                    key={item.name}
                                    to={item.href}
                                    className={({ isActive }) =>
                                        `group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive
                                            ? 'bg-primary-50 text-primary-700'
                                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                        }`
                                    }
                                >
                                    <item.icon
                                        className="mr-3 h-5 w-5 flex-shrink-0"
                                        aria-hidden="true"
                                    />
                                    {item.name}
                                </NavLink>
                            )
                        })}
                    </nav>
                </div>
                <div className="px-4 pb-4">
                    <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-center px-4">
                            <div className="flex-shrink-0">
                                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                                    <span className="text-sm font-medium text-primary-700">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                                <p className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase()}</p>
                            </div>
                            <button
                                onClick={logout}
                                className="ml-auto p-2 text-gray-400 hover:text-gray-500"
                                title="Keluar"
                            >
                                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Sidebar