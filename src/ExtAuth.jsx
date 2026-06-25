import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export default function ExtAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [extId, setExtId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('extId');
    if (id) {
      setExtId(id);
    } else {
      setError("Không tìm thấy Extension ID trong URL. Vui lòng mở trang này thông qua nút Đăng nhập của Extension.");
    }
  }, []);

  const handleLogin = async () => {
    if (!extId) return;
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.idToken) {
        // Gửi token về Extension
        chrome.runtime.sendMessage(extId, { 
          type: 'FIREBASE_AUTH_CREDENTIAL', 
          idToken: credential.idToken 
        }, (response) => {
          if (chrome.runtime.lastError) {
            setError("Lỗi kết nối tới Extension. Bạn hãy kiểm tra lại xem Extension đã được cấp quyền chưa.");
            setLoading(false);
            return;
          }
          setSuccess(true);
          setLoading(false);
          // Tự động đóng tab sau 2 giây
          setTimeout(() => window.close(), 2000);
        });
      } else {
        throw new Error("Không thể lấy token xác thực");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi đăng nhập");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="text-center p-8 bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-sm">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Đăng nhập thành công!</h2>
          <p className="text-sm text-slate-500">Cửa sổ này sẽ tự đóng lại ngay lập tức.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="text-center p-8 bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-sm w-full">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Từ vựng của tôi</h1>
        <p className="text-sm text-slate-500 mb-6">
          Vui lòng chọn tài khoản Google bạn muốn sử dụng cho Extension.
        </p>
        
        {error ? (
          <div className="mb-6 p-4 bg-rose-50 text-rose-500 rounded-xl text-sm border border-rose-100 break-words">
            {error}
          </div>
        ) : null}

        <button
          onClick={handleLogin}
          disabled={loading || !extId}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          ) : (
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5 bg-white rounded-full" />
          )}
          Đăng nhập bằng Google
        </button>
      </div>
    </div>
  );
}
