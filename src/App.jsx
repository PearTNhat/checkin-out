import { useState } from 'react'
import { walletClient, account } from './viemClient'

function App() {
  const [status, setStatus] = useState("")

  const contractAddress = "0xedc125a9e586e67008d4d95cf472f8d54047e37f"

  const sendTx = async (actionName, inputDataStr) => {
    try {
      setStatus(`⏳ Đang gửi giao dịch ${actionName} lên mạng lưới...`)

      const hash = await walletClient.sendTransaction({
        to: contractAddress,
        data: inputDataStr
      })

      setStatus(`✅ Giao dịch ${actionName} đã gửi thành công!\nHash: ${hash}`)
    } catch (error) {
      console.error(error)
      setStatus(`❌ Lỗi: ${error.shortMessage || error.message}`)
    }
  }

  const handleCheckin = () => {
    // Dữ liệu input cứng cho hàm Check-in
    const checkinData = "0x5fdec8a2000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000002531302e3737383639323036363234353236352d3130362e3735313433313838333839383332000000000000000000000000000000000000000000000000000000"
    sendTx("Check-In", checkinData)
  }

  const handleCheckout = () => {
    // Dữ liệu input cứng cho hàm Check-out
    const checkoutData = "0xdcdbf380000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000002531302e3737383639323036363234353236352d3130362e3735313433313838333839383332000000000000000000000000000000000000000000000000000000"
    sendTx("Check-Out", checkoutData)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="text-center p-6 sm:p-8 bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm flex flex-col items-center">
        <h1 className="text-3xl font-extrabold text-slate-800 mb-6 tracking-tight">
          Auto Check-in
        </h1>

        {/* Nút Check-In (Nằm trên) */}
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

        {/* Nút Check-Out (Nằm dưới) */}
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
    </div>
  )
}

export default App
