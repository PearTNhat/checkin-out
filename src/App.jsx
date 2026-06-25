import { useState, useEffect } from 'react'
import { walletClient, account } from './viemClient'
import { PASSWORD_HASH, hashPassword } from './auth'

function App() {
  const [status, setStatus] = useState("")
  const [popup, setPopup] = useState({ isOpen: false, type: "", title: "", message: "" })
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginError, setLoginError] = useState("")

  const contractAddress = "0xedc125a9e586e67008d4d95cf472f8d54047e37f"

  useEffect(() => {
    // Kiểm tra xem đã có mật khẩu băm lưu trong localStorage chưa
    const savedHash = localStorage.getItem('app_auth_hash')
    if (savedHash === PASSWORD_HASH) {
      setIsAuthenticated(true)
    }
  }, [])

  const closePopup = () => setPopup({ ...popup, isOpen: false })

  const handleLogin = async (e) => {
    e.preventDefault()
    if (password.trim() !== "") {
      const inputHash = await hashPassword(password)
      if (inputHash === PASSWORD_HASH) {
        localStorage.setItem('app_auth_hash', inputHash)
        setIsAuthenticated(true)
        setLoginError("")
      } else {
        setLoginError("Mật khẩu không đúng!")
      }
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('app_auth_hash')
    setPassword("")
    setIsAuthenticated(false)
    setStatus("")
  }

  const sendTx = async (actionName, inputDataStr) => {
    try {
      setStatus(`⏳ Đang gửi giao dịch ${actionName} lên mạng lưới...`)

      const hash = await walletClient.sendTransaction({
        to: contractAddress,
        data: inputDataStr
      })

      setStatus(`✅ Giao dịch ${actionName} đã gửi thành công!\nHash: ${hash}`)
      setPopup({
        isOpen: true,
        type: "success",
        title: "Thành công!",
        message: `Giao dịch ${actionName} đã gửi thành công!\nHash: ${hash}`
      })
    } catch (error) {
      console.error(error)
      setStatus(`❌ Lỗi: ${error.shortMessage || error.message}`)
      setPopup({
        isOpen: true,
        type: "error",
        title: "Lỗi giao dịch",
        message: error.shortMessage || error.message
      })
    }
  }

  const handleCheckin = () => {
    const checkinData = "0x5fdec8a2000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000002531302e3737383639323036363234353236352d3130362e3735313433313838333839383332000000000000000000000000000000000000000000000000000000"
    sendTx("Check-In", checkinData)
  }

  const handleCheckout = () => {
    const checkoutData = "0xdcdbf380000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000002531302e3737383639323036363234353236352d3130362e3735313433313838333839383332000000000000000000000000000000000000000000000000000000"
    sendTx("Check-Out", checkoutData)
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="text-center p-8 bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 mb-6 tracking-tight">
            Xác Thực Truy Cập
          </h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input 
              type="password" 
              placeholder="Nhập mật khẩu..." 
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setLoginError("")
              }}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-800 transition-all"
              required
            />
            {loginError && <p className="text-sm text-rose-500 text-left">{loginError}</p>}
            <button 
              type="submit"
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-200 active:scale-95"
            >
              Vào Ứng Dụng
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 relative">
      <button 
        onClick={handleLogout}
        className="absolute top-4 right-4 p-2 bg-white rounded-xl shadow-sm text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors border border-slate-100"
        title="Đăng xuất"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>

      <div className="text-center p-6 sm:p-8 bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm flex flex-col items-center">
        <h1 className="text-3xl font-extrabold text-slate-800 mb-6 tracking-tight">
          Auto Check-in
        </h1>

        {/* Nút Check-In */}
        <div className="py-4 mb-2">
          <button
            onClick={handleCheckin}
            className="group relative flex items-center justify-center w-40 h-40 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-full text-white font-bold text-2xl shadow-[0_0_40px_rgba(52,211,153,0.4)] transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-[0_0_60px_rgba(52,211,153,0.6)]"
          >
            <span className="absolute inset-0 w-full h-full rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
            Check-In
          </button>
        </div>

        <div className="w-full mb-4 p-4 bg-slate-50 rounded-2xl text-left border border-slate-100">
          <p className="text-xs text-slate-400 font-bold uppercase mb-1 tracking-wider">Thông tin ví</p>
          <p className="text-xs font-mono text-slate-700 break-all bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
            🟢 {account.address}
          </p>
        </div>

        <div className="w-full mb-6 p-4 bg-blue-50 rounded-2xl text-left border border-blue-100 min-h-[80px]">
          <p className="text-xs text-blue-400 font-bold uppercase mb-1 tracking-wider">Trạng thái giao dịch</p>
          <p className="text-sm text-blue-900 whitespace-pre-line break-words font-medium">
            {status || "Đang chờ lệnh..."}
          </p>
        </div>

        {/* Nút Check-Out */}
        <div className="py-4 mt-2">
          <button
            onClick={handleCheckout}
            className="group relative flex items-center justify-center w-40 h-40 bg-gradient-to-tr from-rose-400 to-pink-500 rounded-full text-white font-bold text-2xl shadow-[0_0_40px_rgba(251,113,133,0.4)] transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-[0_0_60px_rgba(251,113,133,0.6)]"
          >
            <span className="absolute inset-0 w-full h-full rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
            Check-Out
          </button>
        </div>
      </div>

      {/* Popup Modal */}
      {popup.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full transform transition-all scale-100 animate-in fade-in zoom-in-95 duration-200">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${popup.type === 'success' ? 'bg-emerald-100 text-emerald-500' : 'bg-rose-100 text-rose-500'}`}>
              {popup.type === 'success' ? (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <h3 className="text-xl font-bold text-center text-slate-800 mb-2">{popup.title}</h3>
            <p className="text-sm text-slate-600 text-center mb-6 break-words whitespace-pre-line">{popup.message}</p>
            <button
              onClick={closePopup}
              className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl transition-colors active:scale-95"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
