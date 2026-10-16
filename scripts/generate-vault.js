import readline from 'readline/promises'
import { stdin as input, stdout as output } from 'process'
import { webcrypto } from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { privateKeyToAccount } from 'viem/accounts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const vaultFilePath = path.resolve(__dirname, '../src/cryptoVault.js')

// Hàm format Private Key chuẩn hex
const formatPrivateKey = (key) => {
  if (!key) return ''
  const trimmed = key.trim()
  return trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`
}

async function main() {
  const rl = readline.createInterface({ input, output })

  console.log('\n======================================================')
  console.log('🔐 TOOL TẠO KÉT SẮT MÃ HÓA AES-256-GCM CHO CHECKIN-OUT')
  console.log('======================================================\n')

  try {
    const defaultAddress = '0x5b9bd6157d69771aac09c7c9b2e2ca78bd9a8173'
    console.log(`💡 Địa chỉ ví mặc định hiện tại: ${defaultAddress}\n`)

    let privateKeyInput = await rl.question('👉 1. Nhập Private Key cần bảo vệ (64 ký tự hex):\n> ')
    privateKeyInput = privateKeyInput.trim()

    if (!privateKeyInput) {
      console.log('❌ Lỗi: Private Key không được để trống!')
      rl.close()
      return
    }

    const formattedPk = formatPrivateKey(privateKeyInput)
    let account
    try {
      account = privateKeyToAccount(formattedPk)
      console.log(`✅ Private Key hợp lệ! Địa chỉ ví tương ứng: ${account.address}\n`)
    } catch (err) {
      console.log(`❌ Lỗi: Private Key không hợp lệ (${err.message})`)
      rl.close()
      return
    }

    let passwordInput = await rl.question('👉 2. Nhập Mật Khẩu mới bạn muốn đặt để mở khóa:\n> ')
    passwordInput = passwordInput.trim()

    if (!passwordInput) {
      console.log('❌ Lỗi: Mật khẩu không được để trống!')
      rl.close()
      return
    }

    console.log('\n⏳ Đang tiến hành mã hóa AES-256-GCM qua 100,000 vòng băm PBKDF2...')

    // 1. Tạo Salt ngẫu nhiên (16 bytes) và IV ngẫu nhiên (12 bytes)
    const salt = webcrypto.getRandomValues(new Uint8Array(16))
    const iv = webcrypto.getRandomValues(new Uint8Array(12))

    // 2. PBKDF2 sinh chìa khóa AES 256-bit từ mật khẩu
    const enc = new TextEncoder()
    const pwKey = await webcrypto.subtle.importKey(
      'raw',
      enc.encode(passwordInput),
      'PBKDF2',
      false,
      ['deriveKey']
    )

    const aesKey = await webcrypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      pwKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )

    // 3. Mã hóa Private Key bằng AES-GCM
    const rawPkHex = formattedPk.replace(/^0x/, '')
    const encryptedBuf = await webcrypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      enc.encode(rawPkHex)
    )

    const toHex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')

    const vault = {
      encryptedData: toHex(encryptedBuf),
      iv: toHex(iv),
      salt: toHex(salt),
      address: account.address.toLowerCase(),
    }

    console.log('\n🎉 MÃ HÓA THÀNH CÔNG! Dưới đây là đối tượng Két Sắt AES mới của bạn:\n')
    const vaultCode = `export const ENCRYPTED_VAULT = {
  encryptedData: '${vault.encryptedData}',
  iv: '${vault.iv}',
  salt: '${vault.salt}',
  address: '${vault.address}',
}`
    console.log(vaultCode)
    console.log('\n------------------------------------------------------')

    const autoWrite = await rl.question('👉 Bạn có muốn tự động ghi đè mã này vào "src/cryptoVault.js" không? (y/N): ')
    if (autoWrite.trim().toLowerCase() === 'y') {
      let fileContent = fs.readFileSync(vaultFilePath, 'utf8')
      const regex = /export const ENCRYPTED_VAULT = \{[\s\S]*?\}/
      if (regex.test(fileContent)) {
        fileContent = fileContent.replace(regex, vaultCode)
        fs.writeFileSync(vaultFilePath, fileContent, 'utf8')
        console.log('\n✅ ĐÃ CẬP NHẬT THÀNH CÔNG VÀO src/cryptoVault.js!')
        console.log(`🔑 Từ bây giờ, bạn có thể đăng nhập bằng mật khẩu mới: "${passwordInput}"`)
      } else {
        console.log('⚠️ Không tìm thấy vị trí ENCRYPTED_VAULT để thay thế. Vui lòng copy thủ công.')
      }
    } else {
      console.log('\n💡 Bạn có thể tự copy đoạn code trên và dán vào file "src/cryptoVault.js" khi cần.')
    }
  } catch (err) {
    console.error('❌ Lỗi trong quá trình tạo vault:', err)
  } finally {
    rl.close()
  }
}

main()
