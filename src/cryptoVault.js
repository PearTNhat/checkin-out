// =====================================================================
// BẢO MẬT AES-256-GCM + PBKDF2 (Chuẩn mật mã học Web3 / MetaMask)
// =====================================================================
// Private Key của Chủ sở hữu được mã hóa AES-256-GCM an toàn tuyệt đối.
// Trong mã nguồn KHÔNG HỀ CÓ Private Key chữ rõ và KHÔNG CÓ hash mật khẩu.
// Chỉ khi người dùng nhập đúng mật khẩu thì mới giải mã được Private Key vào RAM.
// =====================================================================

export const ENCRYPTED_VAULT = {
  encryptedData: '7ddcedd7acb7d4b5a686ab65f6518d8a08da914a55ddf9da446107e7d4ab35ecbcdedb1c41fb45b751dbf996085b9e0a648385d17a04d4bf1bc8e729059e3baea36c145115cd4bdf1db171c4d3c2f332',
  iv: 'fb1ea6f04a35315aef0231a9',
  salt: 'b5756fa16b139fffd95cd60357a5a58e',
  address: '0x5b9bd6157d69771aac09c7c9b2e2ca78bd9a8173',
}

// Chuyển chuỗi hex sang Uint8Array
const fromHex = (hex) => new Uint8Array(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))

// Chuyển buffer sang chuỗi hex
const toHex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')

/**
 * Giải mã Private Key từ Vault bằng mật khẩu (AES-256-GCM + PBKDF2 100,000 iterations)
 * @param {string} password Mật khẩu người dùng nhập
 * @param {object} vault Đối tượng vault mã hóa (mặc định là ENCRYPTED_VAULT)
 * @returns {Promise<string>} Private Key dạng 0x...
 */
export async function unlockVault(password, vault = ENCRYPTED_VAULT) {
  if (!password) {
    throw new Error('Vui lòng nhập mật khẩu!')
  }

  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto
  if (!cryptoObj?.subtle) {
    throw new Error('Trình duyệt không hỗ trợ Web Crypto API!')
  }

  const enc = new TextEncoder()
  const pwBuf = enc.encode(password)

  // 1. Nhập password làm PBKDF2 base key
  const pwKey = await cryptoObj.subtle.importKey('raw', pwBuf, 'PBKDF2', false, ['deriveKey'])

  // 2. Dẫn xuất chìa khóa AES-GCM 256-bit qua 100,000 vòng băm SHA-256
  const aesKey = await cryptoObj.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: fromHex(vault.salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    pwKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )

  // 3. Giải mã dữ liệu bằng AES-GCM
  try {
    const decBuf = await cryptoObj.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: fromHex(vault.iv),
      },
      aesKey,
      fromHex(vault.encryptedData)
    )

    const rawKey = new TextDecoder().decode(decBuf).trim()
    return rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`
  } catch (err) {
    // Nếu mật khẩu sai, AES-GCM tự động phát hiện sai authentication tag
    throw new Error('Mật khẩu quản trị không đúng!')
  }
}

/**
 * Mã hóa Private Key bằng mật khẩu mới
 * @param {string} privateKey Private key dạng hex
 * @param {string} password Mật khẩu mới
 * @returns {Promise<object>} Vault object mới
 */
export async function createEncryptedVault(privateKey, password) {
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto
  const enc = new TextEncoder()
  const pwBuf = enc.encode(password)

  const pwKey = await cryptoObj.subtle.importKey('raw', pwBuf, 'PBKDF2', false, ['deriveKey'])

  const salt = cryptoObj.getRandomValues(new Uint8Array(16))
  const iv = cryptoObj.getRandomValues(new Uint8Array(12))

  const aesKey = await cryptoObj.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    pwKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )

  const formattedPk = privateKey.trim().replace(/^0x/, '')
  const encryptedBuf = await cryptoObj.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    enc.encode(formattedPk)
  )

  return {
    encryptedData: toHex(encryptedBuf),
    iv: toHex(iv),
    salt: toHex(salt),
  }
}
