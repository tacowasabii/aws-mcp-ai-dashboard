import { create } from 'zustand'

export interface AWSAccount {
  id: string
  name: string
  region: string
  accessKeyId?: string
  secretAccessKey?: string
  isActive: boolean
  accountId?: string
  arn?: string
  verified?: boolean
}

export interface ChatMessage {
  id: string
  type: 'user' | 'ai' | 'system'
  content: string
  timestamp: Date
  accountId?: string
  conversationId?: string // 대화 세션 ID 추가
}


interface AppState {
  // AWS 계정 상태
  accounts: AWSAccount[]
  activeAccountId: string | null

  // 채팅 상태
  messages: ChatMessage[]
  errorMessages: ChatMessage[]
  isLoading: boolean
  isErrorChatLoading: boolean
  conversationSessions: Map<string, string> // accountId -> conversationId 매핑
  activeChatTab: 'workflow' | 'error'

  // 터미널 상태
  isTerminalOpen: boolean
  isTerminalMinimized: boolean

  // 액션들
  addAccount: (account: AWSAccount) => void
  setActiveAccount: (accountId: string) => void
  removeAccount: (accountId: string) => void
  updateAccount: (accountId: string, updates: Partial<AWSAccount>) => void

  addMessage: (message: ChatMessage) => void
  addErrorMessage: (message: ChatMessage) => void
  clearMessages: () => void
  clearErrorMessages: () => void
  setLoading: (loading: boolean) => void
  setErrorChatLoading: (loading: boolean) => void
  setActiveChatTab: (tab: 'workflow' | 'error') => void
  startNewConversation: (accountId: string) => string // 새 대화 세션 시작
  getConversationId: (accountId: string) => string | undefined

  // 터미널 액션들
  setTerminalOpen: (open: boolean) => void
  setTerminalMinimized: (minimized: boolean) => void

}

export const useAppStore = create<AppState>((set, get) => ({
  accounts: [],
  activeAccountId: null,
  messages: [],
  errorMessages: [],
  isLoading: false,
  isErrorChatLoading: false,
  conversationSessions: new Map(),
  activeChatTab: 'workflow',

  // 터미널 초기 상태
  isTerminalOpen: false,
  isTerminalMinimized: false,
  
  addAccount: (account) => 
    set((state) => {
      // 기존 활성 계정들을 비활성화
      const updatedAccounts = state.accounts.map(acc => ({ ...acc, isActive: false }))
      const newAccount = { ...account, isActive: true }
      return { 
        accounts: [...updatedAccounts, newAccount],
        activeAccountId: newAccount.id
      }
    }),
    
  setActiveAccount: (accountId) => 
    set((state) => ({
      activeAccountId: accountId,
      accounts: state.accounts.map(acc => ({
        ...acc, 
        isActive: acc.id === accountId
      }))
    })),
    
  removeAccount: (accountId) => 
    set((state) => ({
      accounts: state.accounts.filter(acc => acc.id !== accountId),
      activeAccountId: state.activeAccountId === accountId ? null : state.activeAccountId
    })),
    
  updateAccount: (accountId, updates) =>
    set((state) => ({
      accounts: state.accounts.map(acc => 
        acc.id === accountId ? { ...acc, ...updates } : acc
      )
    })),
    
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message]
    })),

  addErrorMessage: (message) =>
    set((state) => ({
      errorMessages: [...state.errorMessages, message]
    })),

  clearMessages: () =>
    set({ messages: [] }),

  clearErrorMessages: () =>
    set({ errorMessages: [] }),
    
  setLoading: (loading) =>
    set({ isLoading: loading }),

  setErrorChatLoading: (loading) =>
    set({ isErrorChatLoading: loading }),

  setActiveChatTab: (tab) =>
    set({ activeChatTab: tab }),

  startNewConversation: (accountId) => {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const newSessions = new Map(get().conversationSessions)
    newSessions.set(accountId, conversationId)

    set((state) => ({
      conversationSessions: newSessions,
    }))

    return conversationId
  },

  getConversationId: (accountId) => {
    return get().conversationSessions.get(accountId)
  },

  // 터미널 액션 구현
  setTerminalOpen: (open) =>
    set({ isTerminalOpen: open }),

  setTerminalMinimized: (minimized) =>
    set({ isTerminalMinimized: minimized }),
}))

// 편의 함수들
export const getActiveAccount = (): AWSAccount | null => {
  const { accounts, activeAccountId } = useAppStore.getState()
  return accounts.find(acc => acc.id === activeAccountId) || null
}

export const generateAccountId = (): string => {
  return `aws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export const generateMessageId = (): string => {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
