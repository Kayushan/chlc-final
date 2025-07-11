import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Clipboard } from 'lucide-react'

export default function ReportViewer() {
  const location = useLocation()
  const navigate = useNavigate()
  // Get reportContent from navigation state
  const reportContent = location.state?.reportContent || ''
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    if (reportContent) {
      await navigator.clipboard.writeText(reportContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <Layout title="School Status Report">
      <div className="max-w-2xl mx-auto mt-4 sm:mt-8 bg-white rounded-lg shadow p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <h1 className="text-base sm:text-xl font-bold text-indigo-700 flex items-center gap-2">
            <span role="img" aria-label="report">📄</span> School Status Report
          </h1>
          <button
            onClick={handleCopy}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition text-xs sm:text-sm w-full sm:w-auto"
            aria-label="Copy report"
          >
            <Clipboard className="h-4 w-4 mr-1" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="whitespace-pre-wrap text-xs sm:text-sm text-gray-800 bg-gray-50 rounded p-2 sm:p-3 overflow-x-auto max-h-[60vh]">
          {reportContent}
        </pre>
        <div className="mt-6 flex flex-col sm:flex-row justify-end gap-2">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs sm:text-sm w-full sm:w-auto"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </Layout>
  )
}
