import { createContext, useState, useContext, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [token, setToken] = useState(localStorage.getItem('token'))

    // Configure axios
    axios.defaults.baseURL = import.meta.env.VITE_API_URL
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }

    useEffect(() => {
        const initAuth = async () => {
            if (token) {
                try {
                    const response = await axios.get('/auth/me')
                    setUser(response.data.user)
                } catch (error) {
                    localStorage.removeItem('token')
                    setToken(null)
                }
            }
            setLoading(false)
        }

        initAuth()
    }, [token])

    const login = async (email, password) => {
        try {
            const response = await axios.post('/auth/login', { email, password })

            if (response.data.success) {
                const { token, user } = response.data
                localStorage.setItem('token', token)
                setToken(token)
                setUser(user)
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
                return { success: true, requiresVerification: false }
            }
        } catch (error) {
            if (error.response?.data?.requiresVerification) {
                return { success: false, requiresVerification: true, email }
            }
            throw error
        }
    }

    const register = async (userData) => {
        const response = await axios.post('/auth/register', userData)
        return response.data
    }

    const verify = async (email, verificationCode) => {
        const response = await axios.post('/auth/verify', { email, verificationCode })
        if (response.data.success) {
            const { token, user } = response.data
            localStorage.setItem('token', token)
            setToken(token)
            setUser(user)
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        }
        return response.data
    }

    const logout = () => {
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
        delete axios.defaults.headers.common['Authorization']
    }

    const resendVerification = async (email) => {
        const response = await axios.post('/auth/resend-verification', { email })
        return response.data
    }

    const value = {
        user,
        loading,
        login,
        register,
        verify,
        logout,
        resendVerification,
        isAuthenticated: !!user
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}