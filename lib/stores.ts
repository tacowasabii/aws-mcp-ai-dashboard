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
  refs?: Array<{
    title: string
    link: string
  }> // n8n 응답의 참조 링크들
}


interface AppState {
  // AWS 계정 상태
  accounts: AWSAccount[]
  activeAccountId: string | null

  // 채팅 상태
  messages: Map<string, ChatMessage[]> // accountId -> messages 매핑
  errorMessages: ChatMessage[]
  isLoading: boolean
  isErrorChatLoading: boolean
  conversationSessions: Map<string, string> // accountId -> conversationId 매핑
  activeChatTab: 'workflow' | 'error'

  // 에러 히스토리 사이드 패널 상태
  isErrorHistoryPanelOpen: boolean

  // 터미널 상태
  isTerminalOpen: boolean
  isTerminalMinimized: boolean
  terminalHeight: number

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

  // 에러 히스토리 패널 액션들
  setErrorHistoryPanelOpen: (open: boolean) => void

  // 터미널 액션들
  setTerminalOpen: (open: boolean) => void
  setTerminalMinimized: (minimized: boolean) => void
  setTerminalHeight: (height: number) => void

}

export const useAppStore = create<AppState>((set, get) => ({
  accounts: [],
  activeAccountId: null,
  messages: new Map(),
  errorMessages: [],
  isLoading: false,
  isErrorChatLoading: false,
  conversationSessions: new Map(),
  activeChatTab: 'workflow',

  // 에러 히스토리 패널 초기 상태
  isErrorHistoryPanelOpen: false,

  // 터미널 초기 상태
  isTerminalOpen: false,
  isTerminalMinimized: false,
  terminalHeight: 384, // 기본 높이 24rem
  
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
    set((state) => {
      const activeAccountId = state.activeAccountId
      if (!activeAccountId) return state

      const accountMessages = state.messages.get(activeAccountId) || []
      const newMessages = new Map(state.messages)
      newMessages.set(activeAccountId, [...accountMessages, message])

      return { messages: newMessages }
    }),

  addErrorMessage: (message) =>
    set((state) => ({
      errorMessages: [...state.errorMessages, message]
    })),

  clearMessages: () => {
    const state = get()
    const activeAccountId = state.activeAccountId

    if (!activeAccountId) return

    // 현재 계정의 메시지만 클리어
    const newMessages = new Map(state.messages)
    newMessages.set(activeAccountId, [])

    set({ messages: newMessages })

    // 새로운 대화 세션 시작 (새로운 conversationId 생성)
    state.startNewConversation(activeAccountId)
  },

  clearErrorMessages: () =>
    set({ errorMessages: [] }),
    
  setLoading: (loading) =>
    set({ isLoading: loading }),

  setErrorChatLoading: (loading) =>
    set({ isErrorChatLoading: loading }),

  setActiveChatTab: (tab) =>
    set({ activeChatTab: tab }),

  startNewConversation: (accountId) => {
    const conversationId = `${accountId}_conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    const newSessions = new Map(get().conversationSessions)
    newSessions.set(accountId, conversationId)

    set({
      conversationSessions: newSessions,
    })

    return conversationId
  },

  getConversationId: (accountId) => {
    return get().conversationSessions.get(accountId)
  },

  // 에러 히스토리 패널 액션 구현
  setErrorHistoryPanelOpen: (open) =>
    set({ isErrorHistoryPanelOpen: open }),

  // 터미널 액션 구현
  setTerminalOpen: (open) =>
    set({ isTerminalOpen: open }),

  setTerminalMinimized: (minimized) =>
    set({ isTerminalMinimized: minimized }),

  setTerminalHeight: (height) =>
    set({ terminalHeight: Math.max(200, Math.min(800, height)) }), // 최소 200px, 최대 800px
}))

// 편의 함수들
export const getActiveAccount = (): AWSAccount | null => {
  const { accounts, activeAccountId } = useAppStore.getState()
  return accounts.find(acc => acc.id === activeAccountId) || null
}

export const generateAccountId = (): string => {
  return `aws-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

export const generateMessageId = (): string => {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

export const getActiveAccountMessages = (): ChatMessage[] => {
  const { messages, activeAccountId } = useAppStore.getState()
  if (!activeAccountId) return []
  return messages.get(activeAccountId) || []
}
