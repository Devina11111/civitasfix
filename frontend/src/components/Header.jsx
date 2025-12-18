import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { BellIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'

const Header = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const { user } = useAuth()

    return (
        <header className="bg-white shadow">
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <button
                            type="button"
                            className="lg:hidden -ml-2 p-2 text-gray-400"
                            onClick={() => setMobileMenuOpen(true)}
                        >
                            <span className="sr-only">Open sidebar</span>
                            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                        </button>
                        <div className="ml-4 lg:ml-0">
                            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
                            <p className="text-sm text-gray-600">Selamat datang, {user?.name}!</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button className="relative p-2 text-gray-400 hover:text-gray-500">
                            <BellIcon className="h-6 w-6" />
                            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)} />
                    <div className="fixed inset-y-0 left-0 flex w-64 max-w-xs">
                        <div className="relative flex w-full max-w-xs flex-col bg-white">
                            <div className="absolute top-0 right-0 -mr-12 pt-2">
                                <button
                                    type="button"
                                    className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-white"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <span className="sr-only">Close sidebar</span>
                                    <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                                </button>
                            </div>
                            <div className="h-0 flex-1 overflow-y-auto pt-5 pb-4">
                                <div className="flex flex-shrink-0 items-center px-4">
                                    <img className="h-8 w-auto" src="/logo.webp" alt="CivitasFix" />
                                    <span className="ml-3 text-xl font-semibold text-gray-900">CivitasFix</span>
                                </div>
                                <nav className="mt-8 px-4 space-y-1">
                                    {/* Mobile navigation items would go here */}
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </header>
    )
}

export default Header