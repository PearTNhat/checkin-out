import { createWalletClient, createPublicClient, http, defineChain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

// Lấy RPC URL qua proxy API (/api/rpc) để tránh lỗi Mixed Content và xử lý CORS/SSL
export const getRpcUrl = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/rpc`
  }
  return 'http://localhost:5173/api/rpc'
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

// Private Key mặc định ban đầu
export const DEFAULT_PRIVATE_KEY = "72aa91a272ca13df75f51127145ca538fed2b9c0a2157c7a751d4c1f79edf5ad"
export const DEFAULT_ADDRESS = "0x5b9bd6157d69771aac09c7c9b2e2ca78bd9a8173".toLowerCase()

// Kiểm tra xem private key có phải là ví mặc định của chủ sở hữu không
export const isDefaultKey = (key) => {
  if (!key) return false
  const formatted = formatPrivateKey(key).toLowerCase()
  const def = formatPrivateKey(DEFAULT_PRIVATE_KEY).toLowerCase()
  return formatted === def
}

const STORAGE_KEY_ACTIVE_KEY = 'app_wallet_private_key'
const STORAGE_KEY_WALLETS = 'app_saved_wallets'

// Chuẩn hóa định dạng private key (phải có 0x)
export const formatPrivateKey = (key) => {
  if (!key) return ''
  const trimmed = key.trim()
  return trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`
}

// Lấy Private Key đang kích hoạt
export const getActivePrivateKey = () => {
  if (typeof window === 'undefined') return formatPrivateKey(DEFAULT_PRIVATE_KEY)
  const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_KEY)
  return saved ? formatPrivateKey(saved) : formatPrivateKey(DEFAULT_PRIVATE_KEY)
}

// Khởi tạo Account từ một private key
export const createAccount = (privateKey) => {
  const formatted = formatPrivateKey(privateKey || getActivePrivateKey())
  return privateKeyToAccount(formatted)
}

// Tạo WalletClient từ Account
export const createClientsForAccount = (acc) => {
  const currentRpc = getRpcUrl()
  const walletClient = createWalletClient({
    account: acc,
    chain: customChain,
    transport: http(currentRpc),
  })

  const publicClient = createPublicClient({
    chain: customChain,
    transport: http(currentRpc),
  })

  return { walletClient, publicClient }
}

// Danh sách ví đã lưu
export const getSavedWallets = () => {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WALLETS)
    if (!raw) {
      // Khởi tạo danh sách mặc định có ví ban đầu
      const defaultAcc = privateKeyToAccount(formatPrivateKey(DEFAULT_PRIVATE_KEY))
      const initial = [
        {
          id: 'default',
          name: 'Ví chính (Nhật Lê Tuấn)',
          address: defaultAcc.address,
          privateKey: formatPrivateKey(DEFAULT_PRIVATE_KEY),
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
    isDefault: formatted.toLowerCase() === formatPrivateKey(DEFAULT_PRIVATE_KEY).toLowerCase(),
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
  setActivePrivateKey(DEFAULT_PRIVATE_KEY)
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
