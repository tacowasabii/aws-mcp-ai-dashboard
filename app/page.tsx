import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
          AWS MCP AI Dashboard
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Bedrock LLM + AWS SDK + LangChain + n8n 워크플로우를 통한 지능형 AWS 자동화 시스템
        </p>
        <Link
          href="/dashboard"
          className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 inline-flex items-center gap-2 text-lg font-medium shadow-lg hover:shadow-xl"
        >
          대시보드로 이동
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>
    </div>
  )
}