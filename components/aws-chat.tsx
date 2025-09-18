'use client'

import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '@/lib/stores'
import { Send, Bot, User } from 'lucide-react'

export function AWSChat() {
  const { activeAccountId, accounts, messages, addMessage } = useAppStore()
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const activeAccount = accounts.find(acc => acc.id === activeAccountId)
  const accountMessages = messages.filter(msg => msg.accountId === activeAccountId)
  
  // 새 메시지가 추가될 때마다 스크롤을 맨 아래로
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [accountMessages])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !activeAccount) return
    
    setIsLoading(true)
    
    // 사용자 메시지 추가
    addMessage({
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
      accountId: activeAccount.id
    })
    
    try {
      // LLM + AWS MCP 시스템을 통한 자연어 쿼리 처리
      const response = await fetch('/api/aws-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: input,
          accountId: activeAccount.id,
          credentials: {
            accessKeyId: activeAccount.accessKeyId,
            secretAccessKey: activeAccount.secretAccessKey,
            region: activeAccount.region
          }
        })
      })
      
      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status}`)
      }
      
      const result = await response.json()
      
      // AI 응답 추가
      addMessage({
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: result.data || '데이터를 조회할 수 없습니다',
        timestamp: new Date(),
        accountId: activeAccount.id
      })
      
    } catch (error) {
      addMessage({
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        timestamp: new Date(),
        accountId: activeAccount.id
      })
    } finally {
      setInput('')
      setIsLoading(false)
    }
  }
  
  if (!activeAccount) {
    return (
      <div className="text-center py-4 text-gray-500">
        <Bot size={24} className="mx-auto mb-2" />
        <p>AWS 계정을 선택하세요</p>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* 상태 표시 */}
      <div className="text-xs text-gray-500 border-b pb-2 mb-4">
        <div className="flex justify-between items-center">
          <span>🤖 Bedrock LLM + AWS SDK</span>
          <span>{activeAccount.region}</span>
        </div>
      </div>
      
      {/* 채팅 메시지 영역 */}
      <div 
        className="flex-1 overflow-y-auto border rounded-lg p-4 bg-gray-50"
        style={{maxHeight: 'calc(100vh - 20rem)', minHeight: '300px'}}
      >
        <div className="space-y-3">
          {accountMessages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-2 ${
                message.type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.type === 'ai' && (
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <Bot size={12} className="text-blue-600" />
                </div>
              )}
              
              <div
                className={`max-w-md px-4 py-3 rounded-lg text-sm whitespace-pre-line ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-800 shadow-sm border'
                }`}
              >
                {message.content}
              </div>
              
              {message.type === 'user' && (
                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <User size={12} className="text-gray-600" />
                </div>
              )}
            </div>
          ))}
          
          {accountMessages.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Bot size={32} className="mx-auto mb-4 text-gray-400" />
              <p className="text-lg mb-2">AWS 전문 어시스턴트</p>
              <p className="text-sm text-gray-400">Bedrock LLM이 AWS 전문가로서 답변합니다. EC2/EKS/VPC는 실시간 데이터로, 다른 질문은 전문 지식으로 답변해드립니다.</p>
            </div>
          )}
          
          {/* 스크롤 참조 */}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* 입력 영역 */}
      <form onSubmit={handleSubmit} className="flex gap-3 mt-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="AWS에 대해 무엇이든 질문하세요..."
          className="flex-1 border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </form>
    </div>
  )
}
