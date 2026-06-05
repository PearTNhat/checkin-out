function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-gray-200">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">
          Hello Tailwind CSS! 🚀
        </h1>
        <p className="text-gray-600 text-lg">
          Nếu bạn thấy chữ lớn màu xanh, hộp có đổ bóng và căn giữa màn hình,<br/>
          nghĩa là Tailwind đã hoạt động hoàn hảo! 🎉
        </p>
        <button className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
          Nút test Tailwind
        </button>
      </div>
    </div>
  )
}

export default App
