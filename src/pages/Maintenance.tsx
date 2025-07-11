import { useNavigate, useLocation } from 'react-router-dom'

export default function Maintenance() {
  const navigate = useNavigate()
  const location = useLocation()

  // If already on /creator-login, don't show maintenance page
  if (location.pathname === '/creator-login') return null

  const handleCreatorClick = () => {
    navigate('/creator-login')
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-yellow-50 px-2 sm:px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-4 sm:p-8 text-center flex flex-col items-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-yellow-700 mb-4">Maintenance Mode</h1>
        <p className="text-gray-700 text-sm sm:text-base mb-8">
          Oops, looks like we’re under maintenance.<br />
          My creator is working on improvements or bug fixes.<br />
          Please check back soon!
        </p>
        <button
          onClick={handleCreatorClick}
          className="text-base sm:text-sm text-yellow-600 hover:underline hover:text-yellow-800 transition mb-6 focus:outline-none bg-transparent border-none cursor-pointer py-2 px-4 rounded"
        >
          Are you my creator?
        </button>
        <div className="text-xs text-gray-400 mt-2">Charis Hope Learning Centre</div>
      </div>
    </div>
  )
}
