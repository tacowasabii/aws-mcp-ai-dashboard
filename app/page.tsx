import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          LLM + AWS MCP Dashboard
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          LLM과 AWS MCP를 통한 순수 자연어 AWS 관리 시스템
        </p>
        <Link 
          href="/dashboard"
          className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          대시보드로 이동
        </Link>
      </div>
    </div>
  )
}