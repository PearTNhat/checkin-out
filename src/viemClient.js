import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { defineChain } from 'viem'

// Lấy RPC URL qua proxy API (/api/rpc) để tránh lỗi Mixed Content (HTTPS gọi HTTP) trên Vercel
const rpcUrl = typeof window !== 'undefined'
  ? `${window.location.origin}/api/rpc`
  : 'http://localhost:5173/api/rpc'

// Khai báo cấu hình mạng lưới tùy chỉnh của bạn (Chain ID: 991)
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
    default: { http: [rpcUrl] },
    public: { http: [rpcUrl] },
  },
})

// Private Key của bạn. Viem yêu cầu chuỗi Hex phải luôn có tiền tố "0x" ở đầu
const rawPrivateKey = "72aa91a272ca13df75f51127145ca538fed2b9c0a2157c7a751d4c1f79edf5ad"
const formattedPrivateKey = rawPrivateKey.startsWith("0x") ? rawPrivateKey : `0x${rawPrivateKey}`

// Khởi tạo Account từ Private Key
export const account = privateKeyToAccount(formattedPrivateKey)

// Tạo WalletClient với cấu hình mạng tùy chỉnh và HTTP RPC qua proxy
export const walletClient = createWalletClient({
  account,
  chain: customChain,
  transport: http(rpcUrl)
})
