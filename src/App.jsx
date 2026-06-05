import { useState } from 'react'
import { walletClient, account } from './viemClient'
import { encodeAbiParameters } from 'viem'

function App() {
  const [status, setStatus] = useState("")
  
  const contractAddress = "0x58435829e890cf83d4e2ec09a756dbe5a06bd280"
  const locationCoordinate = "10.778689751650575-106.75161302089693"

  const sendTx = async (actionName, selector) => {
    try {
      setStatus(`⏳ Đang gửi giao dịch ${actionName} lên mạng lưới...`)
      
      // Tự động encode mảng string tọa độ thành Hex (chuẩn ABI)
      const encodedParams = encodeAbiParameters(
        [{ type: 'string[]' }],
        [[locationCoordinate]]
      )
      
      // Ghép selector (4 bytes đầu) với parameter
      const inputDataStr = selector + encodedParams.slice(2)

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
    // Selector của hàm checkin (từ data 0x5fdec8a2...)
    sendTx("Check-In", "0x5fdec8a2")
  }

  const handleCheckout = () => {
    // Selector của hàm checkout (từ data 0xdcdbf380...)
    sendTx("Check-Out", "0xdcdbf380")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="text-center p-8 bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md">
        <h1 className="text-4xl font-bold text-indigo-600 mb-6">
          Auto Check-in/out
        </h1>
        
        <div className="mb-6 p-4 bg-indigo-50 rounded-xl text-left border border-indigo-100">
          <p className="text-xs text-indigo-500 font-bold uppercase mb-2">Thông tin ví (Private Key):</p>
          <p className="text-sm font-mono text-gray-800 break-all bg-white p-2 rounded border border-indigo-100">
            🟢 {account.address}
          </p>
        </div>

        <div className="mb-6 p-4 bg-green-50 rounded-xl text-left border border-green-100">
          <p className="text-xs text-green-600 font-bold uppercase mb-2">Tọa độ mục tiêu:</p>
          <p className="text-sm font-mono text-gray-800 break-all bg-white p-2 rounded border border-green-100">
            📍 {locationCoordinate}
          </p>
        </div>

        <div className="mb-8 p-4 bg-gray-50 rounded-xl text-left border border-gray-200 min-h-[80px]">
          <p className="text-xs text-gray-500 font-bold uppercase mb-2">Trạng thái giao dịch:</p>
          <p className="text-sm text-gray-800 whitespace-pre-line break-words">
            {status || "Sẵn sàng..."}
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleCheckin}
            className="flex-1 py-4 bg-green-500 hover:bg-green-600 text-white font-bold text-lg rounded-xl transition-all shadow-lg transform hover:-translate-y-1"
          >
            Check-In
          </button>
          <button
            onClick={handleCheckout}
            className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-xl transition-all shadow-lg transform hover:-translate-y-1"
          >
            Check-Out
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
