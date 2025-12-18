import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'react-toastify'

const Verify = () => {
    const [code, setCode] = useState(['', '', '', '', '', ''])
    const [loading, setLoading] = useState(false)
    const [resendLoading, setResendLoading] = useState(false)
    const [timer, setTimer] = useState(60)
    const [email, setEmail] = useState('')

    const { verify, resendVerification } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        const emailFromState = location.state?.email
        const emailFromStorage = localStorage.getItem('verificationEmail')

        if (emailFromState) {
            setEmail(emailFromState)
            localStorage.setItem('verificationEmail', emailFromState)
        } else if (emailFromStorage) {
            setEmail(emailFromStorage)
        } else {
            navigate('/login')
        }
    }, [location, navigate])

    useEffect(() => {
        let interval
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1)
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [timer])

    const handleCodeChange = (index, value) => {
        if (value.length > 1) return

        const newCode = [...code]
        newCode[index] = value
        setCode(newCode)

        // Auto-focus next input
        if (value && index < 5) {
            document.getElementById(`code-${index + 1}`).focus()
        }
    }

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            document.getElementById(`code-${index - 1}`).focus()
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const verificationCode = code.join('')

        if (verificationCode.length !== 6) {
            toast.error('Masukkan semua 6 digit kode')
            return
        }

        setLoading(true)

        try {
            await verify(email, verificationCode)
            toast.success('Email berhasil diverifikasi!')
            localStorage.removeItem('verificationEmail')
            navigate('/dashboard')
        } catch (error) {
            toast.error(error.response?.data?.message || 'Verifikasi gagal')
        } finally {
            setLoading(false)
        }
    }

    const handleResendCode = async () => {
        if (timer > 0) return

        setResendLoading(true)

        try {
            await resendVerification(email)
            toast.success('Kode verifikasi baru telah dikirim!')
            setTimer(60)
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal mengirim ulang kode')
        } finally {
            setResendLoading(false)
        }
    }

    return (
        <div>
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Verifikasi Email</h2>
                <p className="text-gray-600 mt-2">
                    Masukkan 6 digit kode yang dikirim ke <span className="font-semibold">{email}</span>
                </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                        Kode Verifikasi
                    </label>
                    <div className="flex justify-center space-x-2">
                        {code.map((digit, index) => (
                            <input
                                key={index}
                                id={`code-${index}`}
                                type="text"
                                maxLength="1"
                                value={digit}
                                onChange={(e) => handleCodeChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className="w-12 h-12 text-center text-2xl font-semibold border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none"
                            />
                        ))}
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Memverifikasi...' : 'Verifikasi'}
                </button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                    Tidak menerima kode?{' '}
                    <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={timer > 0 || resendLoading}
                        className={`font-medium ${timer > 0 || resendLoading
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-primary-600 hover:text-primary-500'
                            }`}
                    >
                        {resendLoading
                            ? 'Mengirim...'
                            : timer > 0
                                ? `Kirim ulang (${timer}s)`
                                : 'Kirim ulang kode'}
                    </button>
                </p>
            </div>
        </div>
    )
}

export default Verify