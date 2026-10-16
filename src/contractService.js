import { CONTRACT_ADDRESS } from './viemClient'

// Helper đệm 32-byte hex (uint256)
export const padUint256 = (val) => {
  return BigInt(val).toString(16).padStart(64, '0')
}

// Chuyển đổi số giây thành định dạng HH:mm:ss hoặc HH:mm
export const formatSecondsToTime = (seconds, includeSeconds = true) => {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds <= 0) return '--:--'
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0')
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return includeSeconds ? `${h}:${m}:${s}` : `${h}:${m}`
}

// Chuyển số ngày YYYYMMDD thành định dạng DD/MM/YYYY
export const formatDateNum = (dateNum) => {
  if (!dateNum) return ''
  const str = dateNum.toString()
  if (str.length !== 8) return str
  const y = str.slice(0, 4)
  const m = str.slice(4, 6)
  const d = str.slice(6, 8)
  return `${d}/${m}/${y}`
}

// Format ngày YYYYMMDD sang thứ trong tuần tiếng Việt
export const getDayOfWeek = (dateNum) => {
  if (!dateNum) return ''
  const str = dateNum.toString()
  if (str.length !== 8) return ''
  const y = parseInt(str.slice(0, 4), 10)
  const m = parseInt(str.slice(4, 6), 10) - 1
  const d = parseInt(str.slice(6, 8), 10)
  const dateObj = new Date(y, m, d)
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
  return days[dateObj.getDay()] || ''
}

// -------------------------------------------------------------
// 1. checkIn(uint256 year, uint256 month) - Method: 0xd5a33901
// -------------------------------------------------------------
export const sendCheckInTx = async (walletClient, year, month) => {
  const methodId = '0xd5a33901'
  const calldata = `${methodId}${padUint256(year)}${padUint256(month)}`

  const hash = await walletClient.sendTransaction({
    to: CONTRACT_ADDRESS,
    data: calldata,
  })

  return { hash, calldata }
}

// Legacy Fast Check-In & Check-Out (dữ liệu mẫu GPS sniffer)
export const LEGACY_CHECKIN_DATA =
  '0x5fdec8a2000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000002431302e37373836393439303836393630392d3130362e373531343431333834373636373800000000000000000000000000000000000000000000000000000000'

export const LEGACY_CHECKOUT_DATA =
  '0xdcdbf380000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000002431302e37373836393439303836393630392d3130362e373531343431333834373636373800000000000000000000000000000000000000000000000000000000'

export const sendLegacyTx = async (walletClient, actionName, data) => {
  const hash = await walletClient.sendTransaction({
    to: CONTRACT_ADDRESS,
    data,
  })
  return { hash }
}

// -------------------------------------------------------------
// 2. getAttendanceByDate(uint256 date) - Method: 0xe32875db
// Giải mã toàn diện đa bản ghi (Bao gồm cả Check-In và Check-Out)
// -------------------------------------------------------------
export const fetchAttendanceByDate = async (publicClient, accountAddress, dateNum) => {
  const methodId = '0xe32875db'
  const calldata = `${methodId}${padUint256(dateNum)}`

  const res = await publicClient.call({
    to: CONTRACT_ADDRESS,
    data: calldata,
    account: accountAddress,
  })

  if (!res.data || res.data === '0x') {
    return {
      date: dateNum,
      formattedDate: formatDateNum(dateNum),
      dayOfWeek: getDayOfWeek(dateNum),
      records: [],
      hasCheckedIn: false,
      hasCheckedOut: false,
      isCompleted: false,
      statusText: 'Chưa Chấm Công',
    }
  }

  const hex = res.data.slice(2)
  const buf = new Uint8Array(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))

  // Nếu buffer quá ngắn hoặc count = 0
  if (buf.length < 64) {
    return {
      date: dateNum,
      formattedDate: formatDateNum(dateNum),
      dayOfWeek: getDayOfWeek(dateNum),
      records: [],
      hasCheckedIn: false,
      hasCheckedOut: false,
      isCompleted: false,
      statusText: 'Chưa Chấm Công',
    }
  }

  const readBigIntAt = (byteOffset) => {
    if (byteOffset + 32 > buf.length) return 0n
    const slice = buf.slice(byteOffset, byteOffset + 32)
    let hexStr = ''
    for (let i = 0; i < slice.length; i++) {
      hexStr += slice[i].toString(16).padStart(2, '0')
    }
    return BigInt('0x' + (hexStr || '0'))
  }

  const count = Number(readBigIntAt(32)) // slot 1: số lượng bản ghi trong ngày (0, 1 hoặc 2)
  if (count === 0) {
    return {
      date: dateNum,
      formattedDate: formatDateNum(dateNum),
      dayOfWeek: getDayOfWeek(dateNum),
      records: [],
      hasCheckedIn: false,
      hasCheckedOut: false,
      isCompleted: false,
      statusText: 'Chưa Chấm Công',
    }
  }

  const records = []

  for (let r = 0; r < count; r++) {
    const offset = Number(readBigIntAt(64 + r * 32))
    const base = 32 + offset

    if (base >= buf.length) break

    // slot 2: employee address
    const empSlice = buf.slice(base + 2 * 32 + 12, base + 3 * 32)
    let employee = '0x'
    for (let b of empSlice) employee += b.toString(16).padStart(2, '0')

    // slot 4: timeOfDay (giây trong ngày)
    const timeOfDay = Number(readBigIntAt(base + 4 * 32))

    // slot 5: date
    const dVal = Number(readBigIntAt(base + 5 * 32))

    // slot 10: timestamp Unix
    const timestamp = Number(readBigIntAt(base + 10 * 32))

    // slot 11: action (1 = Check-In, 2 = Check-Out)
    const action = Number(readBigIntAt(base + 11 * 32)) || (r === 0 ? 1 : 2)

    // slot 13: status
    const status = Number(readBigIntAt(base + 13 * 32))

    // Tìm chuỗi tọa độ GPS trong khối bản ghi
    let gps = ''
    let mapsUrl = null
    const recordBytes = buf.slice(base, base + 600)
    const recordText = new TextDecoder('utf-8', { fatal: false }).decode(recordBytes)
    const gpsMatch = recordText.match(/(\d{1,2}\.\d+)-(\d{1,3}\.\d+)/)
    if (gpsMatch) {
      gps = gpsMatch[0]
      mapsUrl = `https://www.google.com/maps?q=${gpsMatch[1]},${gpsMatch[2]}`
    }

    records.push({
      action, // 1: Check-In, 2: Check-Out
      employee: employee.toLowerCase(),
      date: dVal || dateNum,
      timeOfDay,
      formattedTime: formatSecondsToTime(timeOfDay),
      timestamp,
      formattedTimestamp: timestamp ? new Date(timestamp * 1000).toLocaleString('vi-VN') : '',
      status,
      gps,
      mapsUrl,
    })
  }

  // Tách riêng Check-In và Check-Out
  const checkInRec = records.find((rec) => rec.action === 1) || (records.length > 0 ? records[0] : null)
  const checkOutRec = records.find((rec) => rec.action === 2) || (records.length > 1 ? records[1] : null)

  const hasCheckedIn = !!checkInRec && checkInRec.timeOfDay > 0
  const hasCheckedOut = !!checkOutRec && checkOutRec.timeOfDay > 0
  const isCompleted = hasCheckedIn && hasCheckedOut

  // Tính tổng thời gian làm việc nếu có cả check-in và check-out
  let totalWorkSeconds = 0
  let totalWorkTimeStr = ''
  if (isCompleted && checkOutRec.timeOfDay >= checkInRec.timeOfDay) {
    totalWorkSeconds = checkOutRec.timeOfDay - checkInRec.timeOfDay
    const h = Math.floor(totalWorkSeconds / 3600)
    const m = Math.floor((totalWorkSeconds % 3600) / 60)
    totalWorkTimeStr = `${h} giờ ${m} phút`
  }

  let statusText = 'Chưa Chấm Công'
  if (isCompleted) {
    statusText = 'Hoàn Thành Cả Ngày'
  } else if (hasCheckedIn) {
    statusText = 'Đang Làm Việc (Chưa Check-Out)'
  }

  return {
    date: dateNum,
    formattedDate: formatDateNum(dateNum),
    dayOfWeek: getDayOfWeek(dateNum),
    records,
    checkInRec,
    checkOutRec,
    hasCheckedIn,
    hasCheckedOut,
    isCompleted,
    statusText,
    totalWorkSeconds,
    totalWorkTimeStr,
    // Thuộc tính tiện lợi cho hiển thị
    employee: checkInRec?.employee || accountAddress?.toLowerCase(),
    formattedTime: checkInRec?.formattedTime || '--:--',
    gps: checkInRec?.gps || checkOutRec?.gps || '',
    mapsUrl: checkInRec?.mapsUrl || checkOutRec?.mapsUrl || null,
  }
}

// -------------------------------------------------------------
// Tra cứu danh sách chấm công theo khoảng ngày (Range)
// Mặc định: Từ ngày 1 của tháng hiện tại đến ngày hiện tại
// -------------------------------------------------------------
export const fetchAttendanceRange = async (publicClient, accountAddress, fromDateStr, toDateStr) => {
  const dates = []
  const start = new Date(fromDateStr)
  const end = new Date(toDateStr)

  let cur = new Date(start)
  while (cur <= end) {
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, '0')
    const d = String(cur.getDate()).padStart(2, '0')
    dates.push(parseInt(`${y}${m}${d}`, 10))
    cur.setDate(cur.getDate() + 1)
  }

  // Truy vấn song song tất cả các ngày trong khoảng
  const results = await Promise.all(
    dates.map(async (dateNum) => {
      try {
        return await fetchAttendanceByDate(publicClient, accountAddress, dateNum)
      } catch (err) {
        console.warn(`Lỗi khi lấy dữ liệu ngày ${dateNum}:`, err)
        return {
          date: dateNum,
          formattedDate: formatDateNum(dateNum),
          dayOfWeek: getDayOfWeek(dateNum),
          records: [],
          hasCheckedIn: false,
          hasCheckedOut: false,
          isCompleted: false,
          statusText: 'Lỗi Truy Vấn',
        }
      }
    })
  )

  // Sắp xếp theo ngày mới nhất lên đầu
  return results.sort((a, b) => b.date - a.date)
}

// -------------------------------------------------------------
// 3. getEmployees() - Method: 0x4abefa36
// -------------------------------------------------------------
export const fetchEmployees = async (publicClient, accountAddress) => {
  const methodId = '0x4abefa36'

  const callParams = {
    to: CONTRACT_ADDRESS,
    data: methodId,
  }
  if (accountAddress) {
    callParams.account = accountAddress
  }

  const res = await publicClient.call(callParams)

  if (!res.data || res.data === '0x') {
    return []
  }

  const hex = res.data.slice(2)
  const buf = new Uint8Array(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))

  const readBigInt = (slotIdx) => {
    const slice = buf.slice(slotIdx * 32, (slotIdx + 1) * 32)
    let hexStr = ''
    for (let i = 0; i < slice.length; i++) {
      hexStr += slice[i].toString(16).padStart(2, '0')
    }
    return BigInt('0x' + (hexStr || '0'))
  }

  const count = Number(readBigInt(1))
  const employees = []

  for (let i = 0; i < count; i++) {
    const baseSlot = 70 + i * 11
    if ((baseSlot + 11) * 32 > buf.length) break

    // Wallet address ở slot 0 của struct
    const walletBytes = buf.slice(baseSlot * 32 + 12, (baseSlot + 1) * 32)
    let wallet = '0x'
    for (let b of walletBytes) wallet += b.toString(16).padStart(2, '0')

    // Độ dài tên ở slot 9
    const nameLen = Number(readBigInt(baseSlot + 9))
    let name = ''
    if (nameLen > 0 && nameLen < 200) {
      const nameBytes = buf.slice((baseSlot + 10) * 32, (baseSlot + 10) * 32 + nameLen)
      name = new TextDecoder('utf-8').decode(nameBytes).replace(/\0/g, '').trim()
    }

    employees.push({
      index: i + 1,
      wallet: wallet.toLowerCase(),
      name: name || `Nhân viên #${i + 1}`,
    })
  }

  return employees
}

// -------------------------------------------------------------
// 4. getInformation() - Method: 0xc0da1e68
// -------------------------------------------------------------
export const fetchInformation = async (publicClient, accountAddress) => {
  const methodId = '0xc0da1e68'

  const res = await publicClient.call({
    to: CONTRACT_ADDRESS,
    data: methodId,
    account: accountAddress,
  })

  if (!res.data || res.data === '0x') {
    return null
  }

  const hex = res.data.slice(2)
  const buf = new Uint8Array(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))

  const readBigInt = (slotIdx) => {
    const slice = buf.slice(slotIdx * 32, (slotIdx + 1) * 32)
    let hexStr = ''
    for (let i = 0; i < slice.length; i++) {
      hexStr += slice[i].toString(16).padStart(2, '0')
    }
    return BigInt('0x' + (hexStr || '0'))
  }

  const readAddress = (slotIdx) => {
    const slice = buf.slice(slotIdx * 32 + 12, (slotIdx + 1) * 32)
    let addr = '0x'
    for (let b of slice) addr += b.toString(16).padStart(2, '0')
    return addr.toLowerCase()
  }

  const wallet = readAddress(3)
  const nameLen = Number(readBigInt(12))
  let name = ''
  if (nameLen > 0 && nameLen < 200) {
    const nameBytes = buf.slice(13 * 32, 13 * 32 + nameLen)
    name = new TextDecoder('utf-8').decode(nameBytes).replace(/\0/g, '').trim()
  }

  return {
    wallet: wallet || accountAddress?.toLowerCase(),
    name: name || 'Nhật Lê Tuấn',
  }
}

// -------------------------------------------------------------
// 5. getShiftConfig() - Method: 0x9dece72c
// -------------------------------------------------------------
export const fetchShiftConfig = async (publicClient) => {
  const methodId = '0x9dece72c'

  const res = await publicClient.call({
    to: CONTRACT_ADDRESS,
    data: methodId,
  })

  if (!res.data || res.data === '0x') {
    return null
  }

  const hex = res.data.slice(2)
  const buf = new Uint8Array(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))

  const readBigInt = (slotIdx) => {
    const slice = buf.slice(slotIdx * 32, (slotIdx + 1) * 32)
    let hexStr = ''
    for (let i = 0; i < slice.length; i++) {
      hexStr += slice[i].toString(16).padStart(2, '0')
    }
    return BigInt('0x' + (hexStr || '0'))
  }

  const morningStart = Number(readBigInt(12)) || 28800
  const morningEnd = Number(readBigInt(13)) || 43200
  const afternoonStart = Number(readBigInt(15)) || 48600
  const afternoonEnd = Number(readBigInt(16)) || 63000

  return {
    morningStart,
    morningEnd,
    afternoonStart,
    afternoonEnd,
    morningStartStr: formatSecondsToTime(morningStart, false),
    morningEndStr: formatSecondsToTime(morningEnd, false),
    afternoonStartStr: formatSecondsToTime(afternoonStart, false),
    afternoonEndStr: formatSecondsToTime(afternoonEnd, false),
  }
}

// -------------------------------------------------------------
// 6. getRoles() - Method: 0x71061398
// -------------------------------------------------------------
export const fetchRoles = async (publicClient) => {
  const methodId = '0x71061398'

  const res = await publicClient.call({
    to: CONTRACT_ADDRESS,
    data: methodId,
  })

  if (!res.data || res.data === '0x') {
    return [1, 4]
  }

  const hex = res.data.slice(2)
  const buf = new Uint8Array(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))

  const readBigInt = (slotIdx) => {
    const slice = buf.slice(slotIdx * 32, (slotIdx + 1) * 32)
    let hexStr = ''
    for (let i = 0; i < slice.length; i++) {
      hexStr += slice[i].toString(16).padStart(2, '0')
    }
    return BigInt('0x' + (hexStr || '0'))
  }

  const r1 = Number(readBigInt(3))
  const r2 = Number(readBigInt(4))
  return [r1, r2].filter((r) => r > 0)
}

// -------------------------------------------------------------
// 7. getMonthlySummary(year, month) - Method: 0xd5a33901
// Lấy các chỉ số thống kê tổng hợp của tháng từ Smart Contract
// -------------------------------------------------------------
export const fetchMonthlySummary = async (publicClient, accountAddress, year, month) => {
  const methodId = '0xd5a33901'
  const calldata = `${methodId}${padUint256(year)}${padUint256(month)}`

  try {
    const res = await publicClient.call({
      to: CONTRACT_ADDRESS,
      data: calldata,
      account: accountAddress,
    })

    if (!res.data || res.data === '0x') {
      return null
    }

    const hex = res.data.slice(2)
    const buf = new Uint8Array(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))

    const readBigInt = (slotIdx) => {
      const slice = buf.slice(slotIdx * 32, (slotIdx + 1) * 32)
      let hexStr = ''
      for (let i = 0; i < slice.length; i++) {
        hexStr += slice[i].toString(16).padStart(2, '0')
      }
      return BigInt('0x' + (hexStr || '0'))
    }

    // Word 3: Số ngày công cơ bản (hoặc ngày tròn)
    const word3 = Number(readBigInt(3))
    // Word 4: Số công chi tiết / nửa ca
    const word4 = Number(readBigInt(4))

    // Tính toán số công (tháng 10: 12.5 công; tháng 9: 27 công)
    let timekeeping = '0.0'
    if (word4 > word3) {
      timekeeping = (word4 * 1.0).toFixed(1)
    } else if (word3 > 0) {
      timekeeping = (word3 + (word4 > 0 ? 0.5 : 0)).toFixed(1)
    }

    const leavePermission = Number(readBigInt(5)) || 0 // Word 5: Nghỉ phép
    const lateCount = Number(readBigInt(6)) || 0 // Word 6: Số lần đi trễ
    const earlyCount = Number(readBigInt(7)) || 0 // Word 7: Số lần về sớm
    const lateSec = Number(readBigInt(8)) || 0 // Word 8: Tổng giây đi trễ
    const earlySec = Number(readBigInt(9)) || 0 // Word 9: Tổng giây về sớm

    const lateHours = Math.floor(lateSec / 3600)
    const lateMins = Math.round((lateSec % 3600) / 60)
    const earlyMins = Math.round(earlySec / 60)

    return {
      year,
      month,
      timekeeping,
      leavePermission: String(leavePermission),
      lateCount,
      earlyCount,
      lateDuration: `${lateHours} Hours ${lateMins} Minutes`,
      earlyDuration: `${earlyMins} Minute`,
      raw: { word3, word4, lateSec, earlySec },
    }
  } catch (err) {
    console.warn(`Lỗi khi gọi getMonthlySummary cho tháng ${month}/${year}:`, err)
    return null
  }
}

// -------------------------------------------------------------
// 8. getOfficeConfig() - Method: 0xe2acc1c5
// Lấy cấu hình vị trí văn phòng, tọa độ GPS và bán kính hợp lệ
// -------------------------------------------------------------
export const fetchOfficeConfig = async (publicClient) => {
  const methodId = '0xe2acc1c5'

  try {
    const res = await publicClient.call({
      to: CONTRACT_ADDRESS,
      data: methodId,
    })

    if (!res.data || res.data === '0x') {
      return null
    }

    const hex = res.data.slice(2)
    const buf = new Uint8Array(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))

    const readBigInt = (slotIdx) => {
      const slice = buf.slice(slotIdx * 32, (slotIdx + 1) * 32)
      let hexStr = ''
      for (let i = 0; i < slice.length; i++) {
        hexStr += slice[i].toString(16).padStart(2, '0')
      }
      return BigInt('0x' + (hexStr || '0'))
    }

    // Word 4: Bán kính điểm danh (mét) - vd: 500m
    const radius = Number(readBigInt(4)) || 500

    // Word 5: Timestamp cấu hình
    const configuredAt = Number(readBigInt(5))

    // Word 12: Chiều dài tên văn phòng, Word 13: chuỗi tên văn phòng ("Be Earning Q2")
    const nameLen = Number(readBigInt(12))
    let name = 'Be Earning Q2'
    if (nameLen > 0 && nameLen < 100) {
      const nameBytes = buf.slice(13 * 32, 13 * 32 + nameLen)
      name = new TextDecoder('utf-8').decode(nameBytes).replace(/\0/g, '').trim()
    }

    // Tìm chuỗi tọa độ GPS trong buffer
    const text = new TextDecoder('utf-8', { fatal: false }).decode(buf)
    const gpsMatch = text.match(/(\d{1,2}\.\d+)-(\d{1,3}\.\d+)/)
    const gps = gpsMatch ? gpsMatch[0] : '10.77869490869609-106.75144138476678'
    const lat = gpsMatch ? gpsMatch[1] : '10.77869490869609'
    const lng = gpsMatch ? gpsMatch[2] : '106.75144138476678'

    return {
      name,
      radius,
      gps,
      lat,
      lng,
      configuredAt,
      mapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
    }
  } catch (err) {
    console.warn('Lỗi khi tải cấu hình văn phòng (0xe2acc1c5):', err)
    return {
      name: 'Be Earning Q2',
      radius: 500,
      gps: '10.77869490869609-106.75144138476678',
      lat: '10.77869490869609',
      lng: '106.75144138476678',
      mapsUrl: 'https://www.google.com/maps?q=10.77869490869609,106.75144138476678',
    }
  }
}

// -------------------------------------------------------------
// 9. extractErrorMessage(err)
// Trích xuất chính xác thông điệp lỗi thực sự từ RPC / Blockchain / Viem
// Bỏ qua các thông báo generic của Viem ("Missing or invalid parameters", "An internal error was received")
// để lấy đúng lỗi chi tiết như MetaTx BLS mismatch, out of gas, revert message, v.v.
// -------------------------------------------------------------
export const extractErrorMessage = (err) => {
  if (!err) return 'Lỗi không xác định'
  if (typeof err === 'string') {
    try {
      const parsed = JSON.parse(err)
      if (parsed.error?.message) return parsed.error.message
      if (parsed.message) return parsed.message
    } catch {}
    return err
  }

  // 1. Viem walk() để tìm root cause sâu nhất có details
  if (typeof err.walk === 'function') {
    const detailError = err.walk((e) => Boolean(e?.details && typeof e.details === 'string'))
    if (detailError?.details?.trim()) return detailError.details.trim()
  }

  // 2. Thuộc tính details trực tiếp từ Viem BaseError
  if (err.details && typeof err.details === 'string' && err.details.trim()) {
    return err.details.trim()
  }

  // 3. Cause details hoặc data/error lồng nhau
  if (err.cause?.details && typeof err.cause.details === 'string' && err.cause.details.trim()) {
    return err.cause.details.trim()
  }
  if (err.cause?.error?.message) {
    return String(err.cause.error.message)
  }
  if (err.cause?.data?.message) {
    return String(err.cause.data.message)
  }
  if (err.data?.message) {
    return String(err.data.message)
  }
  if (err.error?.message) {
    return String(err.error.message)
  }

  // 4. Tìm kiếm từ 'Details:' trong error.message nếu có
  if (typeof err.message === 'string') {
    try {
      const parsed = JSON.parse(err.message)
      if (parsed.error?.message) return parsed.error.message
      if (parsed.message) return parsed.message
    } catch {}

    const detailsMatch = err.message.match(
      /Details:\s*([\s\S]+?)(?:\r?\n\r?\n(?:URL|Version|Request|Raw):|\r?\n(?:URL|Version):|$)/i
    )
    if (detailsMatch && detailsMatch[1] && detailsMatch[1].trim()) {
      return detailsMatch[1].trim()
    }
  }

  // 5. Viem shortMessage nếu không phải là các câu chung chung mặc định gây hiểu lầm
  const genericShortMessages = [
    'An internal error was received',
    'Missing or invalid parameters',
    'Double check you have provided the correct parameters',
    'An error occurred while executing the transaction',
    'Transaction execution error',
  ]
  if (
    err.shortMessage &&
    !genericShortMessages.some((m) => err.shortMessage.toLowerCase().includes(m.toLowerCase()))
  ) {
    return err.shortMessage
  }

  // 6. Cause message
  if (
    err.cause?.message &&
    typeof err.cause.message === 'string' &&
    !genericShortMessages.some((m) => err.cause.message.toLowerCase().includes(m.toLowerCase()))
  ) {
    return err.cause.message
  }

  // 7. Fallback cuối cùng
  return err.details || err.shortMessage || err.message || String(err)
}

