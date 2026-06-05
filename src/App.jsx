import { useState } from 'react'
import { walletClient, account } from './viemClient'

function App() {
  const [status, setStatus] = useState("")

  const handleCheckout = async () => {
    try {
      setStatus("⏳ Đang gửi giao dịch lên mạng lưới...")
      
      const contractAddress = "0x58435829e890cf83d4e2ec09a756dbe5a06bd280"
      const inputDataStr = "0xdcdbf380000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000002531302e3737383638393735313635303537352d3130362e3735313631333032303839363933000000000000000000000000000000000000000000000000000000"

      const hash = await walletClient.sendTransaction({
        to: contractAddress,
        data: inputDataStr
      })

      setStatus(`✅ Giao dịch đã gửi thành công!\nHash: ${hash}`)
    } catch (error) {
      console.error(error)
      setStatus(`❌ Lỗi: ${error.shortMessage || error.message}`)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="text-center p-8 bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md">
        <h1 className="text-4xl font-bold text-indigo-600 mb-6">
          Auto Checkout
        </h1>
        
        <div className="mb-6 p-4 bg-indigo-50 rounded-xl text-left border border-indigo-100">
          <p className="text-xs text-indigo-500 font-bold uppercase mb-2">Thông tin ví (Private Key):</p>
          <p className="text-sm font-mono text-gray-800 break-all bg-white p-2 rounded border border-indigo-100">
            🟢 {account.address}
          </p>
        </div>

        <div className="mb-8 p-4 bg-gray-50 rounded-xl text-left border border-gray-200 min-h-[80px]">
          <p className="text-xs text-gray-500 font-bold uppercase mb-2">Trạng thái giao dịch:</p>
          <p className="text-sm text-gray-800 whitespace-pre-line break-words">
            {status || "Sẵn sàng..."}
          </p>
        </div>

        <button
          onClick={handleCheckout}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-xl transition-all shadow-lg transform hover:-translate-y-1"
        >
          Checkout Trực Tiếp
        </button>
      </div>
    </div>
  )
}

export default App
