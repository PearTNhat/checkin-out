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
  DEFAULT_PRIVATE_KEY,
} from '../viemClient'

import { PASSWORD_HASH, hashPassword } from '../auth'

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
    // Nếu là ví mặc định của chủ sở hữu, yêu cầu xác thực mật khẩu
    if (wallet.isDefault || wallet.privateKey.toLowerCase() === formatPrivateKey(DEFAULT_PRIVATE_KEY).toLowerCase()) {
      setPasswordModal({ isOpen: true, targetWallet: wallet, passwordInput: '', error: '' })
      return
    }

    applyWalletSwitch(wallet)
  }

  const handleVerifyPasswordForDefaultWallet = async (e) => {
    e.preventDefault()
    if (!passwordModal.passwordInput) return
    const h = await hashPassword(passwordModal.passwordInput)
    if (h === PASSWORD_HASH) {
      const target = passwordModal.targetWallet || {
        name: 'Ví chính (Nhật Lê Tuấn)',
        privateKey: formatPrivateKey(DEFAULT_PRIVATE_KEY)
      }
      setPasswordModal({ isOpen: false, targetWallet: null, passwordInput: '', error: '' })
      applyWalletSwitch(target)
    } else {
      setPasswordModal(prev => ({ ...prev, error: 'Mật khẩu quản trị không đúng!' }))
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0F172A] rounded-3xl shadow-2xl border border-white/10 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-100 relative">
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.07] flex items-center justify-between bg-slate-900/60 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-emerald-500/20 border border-white/10 text-indigo-400 flex items-center justify-center shadow-inner">
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
              <h2 className="text-base font-extrabold text-white tracking-tight">Quản Lý Ví Cá Nhân</h2>
              <p className="text-xs text-slate-400">Cấu hình & chuyển đổi private key linh hoạt</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors border border-transparent hover:border-white/10"
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
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 text-rose-300 rounded-2xl text-xs font-medium flex items-center gap-2">
              <span className="shrink-0 text-base">⚠️</span>
              <span className="flex-1">{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 rounded-2xl text-xs font-medium flex items-center gap-2">
              <span className="shrink-0 text-base">✅</span>
              <span className="flex-1">{successMsg}</span>
            </div>
          )}

          {/* Ví đang dùng */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/[0.08] space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Ví Đang Kết Nối
              </span>
              <button
                onClick={() => handleCopy(currentAddress, 'addr')}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline"
              >
                {copied === 'addr' ? '✓ Đã sao chép' : 'Sao chép địa chỉ'}
              </button>
            </div>

            <div className="font-mono text-xs bg-slate-950/80 p-3 rounded-xl border border-white/[0.06] text-slate-200 break-all select-all shadow-inner">
              {currentAddress}
            </div>

            {/* Private key hiện tại */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-400 font-medium">Private Key đang dùng</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 underline"
                  >
                    {showKey ? 'Ẩn' : 'Hiện'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(activeKey, 'key')}
                    className="text-[11px] text-emerald-400 hover:underline"
                  >
                    {copied === 'key' ? '✓ Đã chép' : 'Sao chép key'}
                  </button>
                </div>
              </div>
              <div className="font-mono text-xs bg-slate-950/80 p-3 rounded-xl border border-white/[0.06] text-slate-400 break-all select-all">
                {showKey ? activeKey : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
              </div>
            </div>
          </div>

          {/* Danh sách các ví đã lưu */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Danh Sách Ví Đã Lưu ({wallets.length})
              </h3>
              <button
                type="button"
                onClick={handleResetDefault}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium hover:underline"
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
                        ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/40 shadow-sm shadow-emerald-500/10'
                        : 'bg-slate-900/50 border-white/[0.06] hover:border-slate-700 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">{w.name}</span>
                        {isActive && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Đang dùng
                          </span>
                        )}
                        {w.isDefault && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            Ví chủ
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-slate-400 truncate mt-0.5">{w.address}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!w.isDefault && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(w.address, e)}
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
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
          <div className="pt-2 border-t border-white/[0.06]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              ➕ Nhập / Thêm Private Key Mới
            </h3>
            <form onSubmit={handleAddWallet} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Tên gợi nhớ (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Ví làm việc, Ví phụ..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700/80 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-950/70 text-slate-200"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                  Private Key (Hex 64 ký tự)
                </label>
                <input
                  type="password"
                  placeholder="Nhập chuỗi private key..."
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700/80 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-950/70 text-slate-200"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-indigo-500 via-blue-600 to-indigo-600 hover:from-indigo-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-500/20 active:scale-98"
              >
                Lưu & Kích Hoạt Ví Này
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] bg-slate-950/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Dữ liệu ví được lưu bảo mật trong LocalStorage</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold rounded-xl transition-colors active:scale-95"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Modal yêu cầu mật khẩu khi chọn Ví Mặc Định của Chủ Sở Hữu */}
      {passwordModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#0F172A] rounded-3xl p-6 shadow-2xl max-w-xs w-full text-left space-y-4 border border-white/10">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl shadow-inner">
              🔒
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Xác Thực Chủ Sở Hữu</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-950 text-white"
                autoFocus
                required
              />
              {passwordModal.error && (
                <p className="text-[11px] text-rose-400 font-semibold">{passwordModal.error}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPasswordModal({ isOpen: false, targetWallet: null, passwordInput: '', error: '' })}
                  className="flex-1 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.05] rounded-xl transition-colors border border-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
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
