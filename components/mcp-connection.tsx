'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/stores'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'

export function MCPConnection() {
  const { activeAccountId, accounts } = useAppStore()
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const [error, setError] = useState<string>()
  
  const activeAccount = accounts.find(acc => acc.id === activeAccountId)
  
  const testConnection = async () => {
    if (!activeAccount) return
    
    setStatus('connecting')
    setError(undefined)
    
    try {
      const response = await fetch('/api/aws-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: {
            accessKeyId: activeAccount.accessKeyId,
            secretAccessKey: activeAccount.secretAccessKey,
            region: activeAccount.region
          }
        })
      })
      
      if (response.ok) {
        setStatus('connected')
      } else {
        const result = await response.json()
        throw new Error(result.error || '연결 실패')
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : '연결 실패')
    }
  }
  
  useEffect(() => {
    if (activeAccount) {
      testConnection()
    } else {
      setStatus('disconnected')
    }
  }, [activeAccount])
  
  if (!activeAccount) {
    return <div className="text-xs text-gray-500">계정을 선택하세요</div>
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status === 'connected' ? (
            <Wifi size={14} className="text-green-500" />
          ) : (
            <WifiOff size={14} className="text-red-500" />
          )}
          <span className="text-xs">
            {{
              'disconnected': '연결 안됨',
              'connecting': '연결 중',
              'connected': '연결됨',
              'error': '오류'
            }[status]}
          </span>
        </div>
        
        <button
          onClick={testConnection}
          className="p-1 text-gray-400 hover:text-blue-600"
          disabled={status === 'connecting'}
        >
          <RefreshCw size={12} className={status === 'connecting' ? 'animate-spin' : ''} />
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded text-xs">
          {error}
        </div>
      )}
      
      {status === 'connected' && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-2 rounded text-xs">
          ✅ AWS API 연결 성공
        </div>
      )}
    </div>
  )
}
