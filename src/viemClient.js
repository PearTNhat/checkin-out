import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { defineChain } from 'viem'

// Khai báo cấu hình mạng lưới tùy chỉnh của bạn (Chain ID: 991, RPC: 139.59.243.85:8545)
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
    default: { http: ['https://rpc-proxy-sequoia.iqnb.com:8446'] },
    public: { http: ['https://rpc-proxy-sequoia.iqnb.com:8446'] },
  },
})

// Private Key của bạn. Viem yêu cầu chuỗi Hex phải luôn có tiền tố "0x" ở đầu
const rawPrivateKey = "41acc857cdc74215d5b5e1c4f497ef88409c8f095689f11930f1924efdf8bb12"
const formattedPrivateKey = rawPrivateKey.startsWith("0x") ? rawPrivateKey : `0x${rawPrivateKey}`

// Khởi tạo Account từ Private Key
export const account = privateKeyToAccount(formattedPrivateKey)

// Tạo WalletClient với cấu hình mạng tùy chỉnh và HTTP RPC
export const walletClient = createWalletClient({
  account,
  chain: customChain,
  transport: http() // Không truyền gì vào thì nó sẽ tự lấy RPC từ customChain ở trên
})
