import { createWalletClient, createPublicClient, http, defineChain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

// Lấy RPC URL trực tiếp từ biến môi trường VITE_RPC_URL (bắt buộc cấu hình trong .env)
export const getRpcUrl = () => {
  const url = import.meta.env?.VITE_RPC_URL
  if (!url) {
    throw new Error('Lỗi: Chưa cấu hình biến môi trường VITE_RPC_URL trong file .env')
  }
  return url
}

// Khai báo cấu hình mạng lưới tùy chỉnh (Chain ID: 991)
export const customChain = defineChain({
  id: 991,
  name: 'Custom Network 991',
  network: 'custom991',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: [getRpcUrl()] },
    public: { http: [getRpcUrl()] },
  },
})

// Địa chỉ Smart Contract chấm công
export const CONTRACT_ADDRESS = "0xfa7eab272d80dd940af6044bae1f8a0f986eb72a"

// Địa chỉ ví chủ sở hữu (Công khai) - Private Key được bảo vệ bằng AES-256-GCM trong cryptoVault.js
export const DEFAULT_ADDRESS = "0x5b9bd6157d69771aac09c7c9b2e2ca78bd9a8173".toLowerCase()

// Kiểm tra xem private key có phải là ví mặc định của chủ sở hữu không
export const isDefaultKey = (key) => {
  if (!key) return false
  try {
    const acc = privateKeyToAccount(formatPrivateKey(key))
    return acc.address.toLowerCase() === DEFAULT_ADDRESS
  } catch {
    return false
  }
}

const STORAGE_KEY_ACTIVE_KEY = 'app_wallet_private_key'
const STORAGE_KEY_WALLETS = 'app_saved_wallets'
const SESSION_KEY_UNLOCKED = 'app_unlocked_private_key'

// Chuẩn hóa định dạng private key (phải có 0x)
export const formatPrivateKey = (key) => {
  if (!key) return ''
  const trimmed = key.trim()
  return trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`
}

// Lấy Private Key đang kích hoạt
export const getActivePrivateKey = () => {
  if (typeof window === 'undefined') return ''
  // 1. Kiểm tra session key trong RAM (cho ví chủ sau khi mở khóa AES thành công)
  const sessionKey = sessionStorage.getItem(SESSION_KEY_UNLOCKED)
  if (sessionKey) return formatPrivateKey(sessionKey)

  // 2. Kiểm tra key của ví khác đã lưu
  const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_KEY)
  return saved ? formatPrivateKey(saved) : ''
}

// Khởi tạo Account từ một private key
export const createAccount = (privateKey) => {
  const pk = privateKey || getActivePrivateKey()
  if (!pk) {
    // Nếu chưa đăng nhập / chưa mở khóa AES, trả về account giả định chỉ đọc với DEFAULT_ADDRESS
    return {
      address: DEFAULT_ADDRESS,
      type: 'json-rpc',
    }
  }
  const formatted = formatPrivateKey(pk)
  return privateKeyToAccount(formatted)
}

// Tạo WalletClient từ Account
export const createClientsForAccount = (acc) => {
  const currentRpc = getRpcUrl()
  const publicClient = createPublicClient({
    chain: customChain,
    transport: http(currentRpc),
  })

  let walletClient = null
  if (acc && typeof acc.signTransaction === 'function') {
    walletClient = createWalletClient({
      account: acc,
      chain: customChain,
      transport: http(currentRpc),
    })
  }

  return { walletClient, publicClient }
}

// Danh sách ví đã lưu
export const getSavedWallets = () => {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WALLETS)
    if (!raw) {
      // Khởi tạo danh sách mặc định (không lưu Private Key dạng chữ rõ)
      const initial = [
        {
          id: 'default',
          name: 'Ví chính (Nhật Lê Tuấn)',
          address: DEFAULT_ADDRESS,
          privateKey: '', // Được bảo vệ bằng AES-256 Vault
          isDefault: true,
        },
      ]
      localStorage.setItem(STORAGE_KEY_WALLETS, JSON.stringify(initial))
      return initial
    }
    return JSON.parse(raw)
  } catch {
    return []
  }
}

// Lưu ví mới hoặc cập nhật ví
export const saveWallet = (name, privateKey) => {
  const formatted = formatPrivateKey(privateKey)
  const acc = privateKeyToAccount(formatted)
  const wallets = getSavedWallets()

  const existingIndex = wallets.findIndex((w) => w.address.toLowerCase() === acc.address.toLowerCase())
  const item = {
    id: acc.address.toLowerCase(),
    name: name || `Ví ${acc.address.slice(0, 6)}...${acc.address.slice(-4)}`,
    address: acc.address,
    privateKey: formatted,
    isDefault: acc.address.toLowerCase() === DEFAULT_ADDRESS,
  }

  if (existingIndex >= 0) {
    wallets[existingIndex] = { ...wallets[existingIndex], ...item }
  } else {
    wallets.push(item)
  }

  localStorage.setItem(STORAGE_KEY_WALLETS, JSON.stringify(wallets))
  return item
}

// Xóa ví đã lưu
export const deleteSavedWallet = (address) => {
  const wallets = getSavedWallets().filter((w) => w.address.toLowerCase() !== address.toLowerCase())
  localStorage.setItem(STORAGE_KEY_WALLETS, JSON.stringify(wallets))
}

// Đổi ví đang kích hoạt
export const setActivePrivateKey = (privateKey) => {
  const formatted = formatPrivateKey(privateKey)
  localStorage.setItem(STORAGE_KEY_ACTIVE_KEY, formatted)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app_wallet_changed', { detail: { privateKey: formatted } }))
  }
}

// Khôi phục ví mặc định
export const resetToDefaultWallet = () => {
  const sessionKey = sessionStorage.getItem(SESSION_KEY_UNLOCKED)
  if (sessionKey) {
    setActivePrivateKey(sessionKey)
  }
}

// Khởi tạo các instance mặc định ban đầu để các module khác import trực tiếp
export let account = createAccount()
export let { walletClient, publicClient } = createClientsForAccount(account)

// Lắng nghe sự kiện đổi ví để cập nhật instance toàn cục
if (typeof window !== 'undefined') {
  window.addEventListener('app_wallet_changed', (e) => {
    try {
      account = createAccount(e.detail.privateKey)
      const clients = createClientsForAccount(account)
      walletClient = clients.walletClient
      publicClient = clients.publicClient
    } catch (err) {
      console.error('Lỗi khi cập nhật ví mới:', err)
    }
  })
}
