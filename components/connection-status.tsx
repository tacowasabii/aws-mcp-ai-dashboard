'use client'

import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/lib/stores'
import { Wifi, WifiOff } from 'lucide-react'

export function ConnectionStatus() {
  const { activeAccountId, accounts } = useAppStore()
  const activeAccount = accounts.find(acc => acc.id === activeAccountId)
  
  const { data: connectionStatus, isLoading } = useQuery({
    queryKey: ['aws-connection', activeAccountId],
    queryFn: async () => {
      if (!activeAccount) return { connected: false }
      
      try {
        const response = await fetch('/api/verify-aws', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessKeyId: activeAccount.accessKeyId,
            secretAccessKey: activeAccount.secretAccessKey,
            region: activeAccount.region
          })
        })
        
        const result = await response.json()
        return { connected: result.success }
      } catch {
        return { connected: false }
      }
    },
    enabled: !!activeAccount,
    refetchInterval: 30000 // 30초마다 체크
  })
  
  if (!activeAccount) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <WifiOff size={16} />
        <span>계정 미선택</span>
      </div>
    )
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        <span>연결 확인 중...</span>
      </div>
    )
  }
  
  return (
    <div className={`flex items-center gap-2 ${
      connectionStatus?.connected ? 'text-green-600' : 'text-red-600'
    }`}>
      {connectionStatus?.connected ? (
        <Wifi size={16} />
      ) : (
        <WifiOff size={16} />
      )}
      <span>
        {connectionStatus?.connected ? 'AWS 연결됨' : 'AWS 연결 실패'}
      </span>
    </div>
  )
}