import { useState, useEffect } from 'react'
import {
  getActivePrivateKey,
  setActivePrivateKey,
  getSavedWallets,
  saveWallet,
  deleteSavedWallet,
  resetToDefaultWallet,
  formatPrivateKey,
  createAccount,
  DEFAULT_ADDRESS,
} from '../viemClient'

import { unlockVault } from '../cryptoVault'

export default function WalletManagerModal({ isOpen, onClose, currentAddress, onWalletChanged }) {
  const [wallets, setWallets] = useState([])
  const [activeKey, setActiveKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState('')

  // Form thêm ví mới
  const [newKey, setNewKey] = useState('')
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Xác thực mật khẩu khi muốn chuyển sang ví mặc định
  const [passwordModal, setPasswordModal] = useState({ isOpen: false, targetWallet: null, passwordInput: '', error: '' })

  const reloadData = () => {
    const list = getSavedWallets()
    setWallets(list)
    setActiveKey(getActivePrivateKey())
  }

  useEffect(() => {
    if (isOpen) {
      reloadData()
      setError('')
      setSuccessMsg('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(''), 2000)
  }

  const applyWalletSwitch = (wallet) => {
    try {
      setActivePrivateKey(wallet.privateKey)
      setActiveKey(wallet.privateKey)
      reloadData()
      if (onWalletChanged) onWalletChanged()
      setSuccessMsg(`Đã chuyển sang ${wallet.name}!`)
      setTimeout(() => setSuccessMsg(''), 2500)
    } catch (err) {
      setError(`Lỗi: ${err.message}`)
    }
  }

  const handleSelectWallet = async (wallet) => {
    // Nếu là ví mặc định của chủ sở hữu, yêu cầu xác thực mở khóa AES bằng mật khẩu
    if (wallet.isDefault || wallet.address?.toLowerCase() === DEFAULT_ADDRESS) {
      setPasswordModal({ isOpen: true, targetWallet: wallet, passwordInput: '', error: '' })
      return
    }

    applyWalletSwitch(wallet)
  }

  const handleVerifyPasswordForDefaultWallet = async (e) => {
    e.preventDefault()
    if (!passwordModal.passwordInput) return

    try {
      // Dùng mật khẩu giải mã AES-256-GCM để lấy Private Key thật vào RAM
      const decryptedPk = await unlockVault(passwordModal.passwordInput)
      sessionStorage.setItem('app_unlocked_private_key', decryptedPk)
      sessionStorage.setItem('app_session_type', 'owner')

      const target = {
        id: 'default',
        name: 'Ví chính (Nhật Lê Tuấn)',
        address: DEFAULT_ADDRESS,
        privateKey: decryptedPk,
        isDefault: true,
      }
      setPasswordModal({ isOpen: false, targetWallet: null, passwordInput: '', error: '' })
      applyWalletSwitch(target)
    } catch (err) {
      setPasswordModal((prev) => ({ ...prev, error: 'Mật khẩu quản trị không đúng!' }))
    }
  }

  const handleAddWallet = (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    try {
      const formatted = formatPrivateKey(newKey)
      if (formatted.length !== 66) {
        throw new Error('Private key không hợp lệ! Độ dài chuẩn phải là 64 ký tự hex (kèm tiền tố 0x thành 66).')
      }

      // Thử tạo account để kiểm tra tính hợp lệ
      const acc = createAccount(formatted)
      const saved = saveWallet(newName.trim() || `Ví ${acc.address.slice(0, 6)}...`, formatted)

      // Tự động kích hoạt ví vừa thêm
      setActivePrivateKey(formatted)
      setNewKey('')
      setNewName('')
      reloadData()
      if (onWalletChanged) onWalletChanged()
      setSuccessMsg(`Đã thêm và kích hoạt ${saved.name}!`)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError(err.message || 'Private key không hợp lệ!')
    }
  }

  const handleDelete = (address, e) => {
    e.stopPropagation()
    if (confirm('Bạn có chắc chắn muốn xóa ví này khỏi danh sách đã lưu?')) {
      deleteSavedWallet(address)
      reloadData()
    }
  }

  const handleResetDefault = () => {
    if (confirm('Khôi phục về Private Key mặc định ban đầu?')) {
      resetToDefaultWallet()
      reloadData()
      if (onWalletChanged) onWalletChanged()
      setSuccessMsg('Đã khôi phục ví mặc định ban đầu!')
      setTimeout(() => setSuccessMsg(''), 2500)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-800 relative">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Quản Lý Ví Cá Nhân</h2>
              <p className="text-xs text-slate-500">Cấu hình & chuyển đổi private key linh hoạt</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
          {/* Thông báo */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium flex items-center gap-2">
              <span className="shrink-0 text-base">⚠️</span>
              <span className="flex-1">{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium flex items-center gap-2">
              <span className="shrink-0 text-base">✅</span>
              <span className="flex-1">{successMsg}</span>
            </div>
          )}

          {/* Ví đang dùng */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Ví Đang Kết Nối
              </span>
              <button
                onClick={() => handleCopy(currentAddress, 'addr')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
              >
                {copied === 'addr' ? '✓ Đã sao chép' : 'Sao chép địa chỉ'}
              </button>
            </div>

            <div className="font-mono text-xs bg-white p-3 rounded-xl border border-slate-200 text-slate-800 break-all select-all shadow-xs">
              {currentAddress}
            </div>

            {/* Private key hiện tại */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-500 font-medium">Private Key đang dùng</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    {showKey ? 'Ẩn' : 'Hiện'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(activeKey, 'key')}
                    className="text-[11px] text-indigo-600 hover:underline cursor-pointer"
                  >
                    {copied === 'key' ? '✓ Đã chép' : 'Sao chép key'}
                  </button>
                </div>
              </div>
              <div className="font-mono text-xs bg-white p-3 rounded-xl border border-slate-200 text-slate-500 break-all select-all">
                {showKey ? activeKey : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
              </div>
            </div>
          </div>

          {/* Danh sách các ví đã lưu */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Danh Sách Ví Đã Lưu ({wallets.length})
              </h3>
              <button
                type="button"
                onClick={handleResetDefault}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline cursor-pointer"
                title="Khôi phục về Private Key ban đầu"
              >
                Khôi phục mặc định
              </button>
            </div>

            <div className="space-y-2">
              {wallets.map((w) => {
                const isActive = w.privateKey.toLowerCase() === activeKey.toLowerCase()
                return (
                  <div
                    key={w.address}
                    onClick={() => handleSelectWallet(w)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isActive
                        ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">{w.name}</span>
                        {isActive && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                            Đang dùng
                          </span>
                        )}
                        {w.isDefault && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            Ví chủ
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-slate-500 truncate mt-0.5">{w.address}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!w.isDefault && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(w.address, e)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Xóa ví này"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Form thêm ví mới */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
              ➕ Nhập / Thêm Private Key Mới
            </h3>
            <form onSubmit={handleAddWallet} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Tên gợi nhớ (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Ví làm việc, Ví phụ..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                  Private Key (Hex 64 ký tự)
                </label>
                <input
                  type="password"
                  placeholder="Nhập chuỗi private key..."
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 bg-white text-slate-900"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-200 active:scale-98 cursor-pointer"
              >
                Lưu & Kích Hoạt Ví Này
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Dữ liệu ví được lưu bảo mật trong LocalStorage</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors active:scale-95 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Modal yêu cầu mật khẩu khi chọn Ví Mặc Định của Chủ Sở Hữu */}
      {passwordModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-xs w-full text-left space-y-4 border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-xl shadow-xs">
              🔒
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Xác Thực Chủ Sở Hữu</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Đây là Ví Mặc Định (Nhật Lê Tuấn). Vui lòng nhập mật khẩu quản trị để sử dụng ví này.
              </p>
            </div>

            <form onSubmit={handleVerifyPasswordForDefaultWallet} className="space-y-3">
              <input
                type="password"
                placeholder="Nhập mật khẩu quản trị..."
                value={passwordModal.passwordInput}
                onChange={(e) =>
                  setPasswordModal((prev) => ({ ...prev, passwordInput: e.target.value, error: '' }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 bg-white text-slate-900"
                autoFocus
                required
              />
              {passwordModal.error && (
                <p className="text-[11px] text-rose-600 font-semibold">{passwordModal.error}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPasswordModal({ isOpen: false, targetWallet: null, passwordInput: '', error: '' })}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  Xác Nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
