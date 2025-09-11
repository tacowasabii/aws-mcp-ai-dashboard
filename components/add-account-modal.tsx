'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/stores'
import { AWSAccount } from '@/types'
import { X, Loader2 } from 'lucide-react'

interface AddAccountModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddAccountModal({ isOpen, onClose }: AddAccountModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    region: 'us-east-1',
    accessKeyId: '',
    secretAccessKey: ''
  })
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState('')
  
  const addAccount = useAppStore(state => state.addAccount)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsVerifying(true)
    setError('')
    
    try {
      // AWS 계정 검증
      const response = await fetch('/api/verify-aws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        const newAccount: AWSAccount = {
          id: result.accountId || Date.now().toString(),
          name: formData.name,
          region: formData.region,
          accessKeyId: formData.accessKeyId,
          secretAccessKey: formData.secretAccessKey,
          isActive: true
        }
        
        addAccount(newAccount)
        onClose()
        setFormData({ name: '', region: 'us-east-1', accessKeyId: '', secretAccessKey: '' })
      } else {
        setError(result.error || 'AWS 계정 검증에 실패했습니다')
      }
    } catch (error) {
      setError('연결 중 오류가 발생했습니다')
    } finally {
      setIsVerifying(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">AWS 계정 추가</h2>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">계정 이름</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full border rounded px-3 py-2"
              placeholder="예: Production Account"
              required
              disabled={isVerifying}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">리전</label>
            <select
              value={formData.region}
              onChange={(e) => setFormData({...formData, region: e.target.value})}
              className="w-full border rounded px-3 py-2"
              disabled={isVerifying}
            >
              <option value="us-east-1">US East (N. Virginia)</option>
              <option value="us-west-2">US West (Oregon)</option>
              <option value="ap-northeast-2">Asia Pacific (Seoul)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Access Key ID</label>
            <input
              type="text"
              value={formData.accessKeyId}
              onChange={(e) => setFormData({...formData, accessKeyId: e.target.value})}
              className="w-full border rounded px-3 py-2"
              placeholder="AKIA..."
              required
              disabled={isVerifying}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Secret Access Key</label>
            <input
              type="password"
              value={formData.secretAccessKey}
              onChange={(e) => setFormData({...formData, secretAccessKey: e.target.value})}
              className="w-full border rounded px-3 py-2"
              required
              disabled={isVerifying}
            />
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
              disabled={isVerifying}
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isVerifying}
            >
              {isVerifying && <Loader2 size={16} className="animate-spin" />}
              {isVerifying ? '검증 중...' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}