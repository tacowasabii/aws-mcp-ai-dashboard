// AWS 관련 타입들
export interface AWSCredentials {
  accessKeyId: string
  secretAccessKey: string
  region?: string
}

// LLM + MCP 통합 타입들
export interface LLMAWSResponse {
  success: boolean
  answer?: string
  data?: any
  mcpUsed?: boolean
  reasoning?: string
  error?: string
}

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
  lastVerified?: Date
}

export interface EC2Instance {
  instanceId: string
  name: string
  state: string
  instanceType: string
  availabilityZone: string
  publicIpAddress?: string
  privateIpAddress?: string
  launchTime?: Date
}

export interface S3Bucket {
  name: string
  creationDate?: Date
  region?: string
}

export interface AWSAccountInfo {
  accountId: string
  arn: string
  userId: string
  region: string
}

// MCP 관련 타입들
export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: string
    properties: Record<string, any>
    required: string[]
  }
}

export interface MCPToolCall {
  toolName: string
  parameters: any
  reason?: string
}

export interface MCPToolResult {
  toolName: string
  data: any
  success: boolean
  error?: string
}

export interface MCPServer {
  id: string
  name: string
  url: string
  accountId: string
  isConnected: boolean
  tools?: MCPTool[]
  resources?: any[]
  prompts?: any[]
}

// 채팅 관련 타입들
export interface ChatMessage {
  id: string
  type: 'user' | 'ai' | 'system' | 'error'
  content: string
  timestamp: Date
  accountId?: string
  toolCalls?: MCPToolCall[]
  toolResults?: MCPToolResult[]
}

export interface BedrockMessage {
  role: 'user' | 'assistant'
  content: string
}

// Bedrock 관련 타입들
export interface BedrockConfig {
  modelId: string
  region: string
  isConfigured: boolean
  accessKeyId?: string
  secretAccessKey?: string
}

export interface BedrockResponse {
  data: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

// API 응답 타입들
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

export interface AWSQueryResponse {
  data: string
  fallback?: string
  info?: string
  error?: string
  code?: string
}

// 유틸리티 타입들
export type AWSRegion = 
  | 'us-east-1'
  | 'us-east-2' 
  | 'us-west-1'
  | 'us-west-2'
  | 'eu-west-1'
  | 'eu-central-1'
  | 'ap-northeast-1'
  | 'ap-northeast-2'
  | 'ap-southeast-1'
  | 'ap-southeast-2'

export type MessageType = 'user' | 'ai' | 'system' | 'error'

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

// 환경변수 타입 (LLM + MCP 통합)
export interface EnvConfig {
  // LLM API 키 (OpenAI 또는 Anthropic)
  OPENAI_API_KEY?: string
  ANTHROPIC_API_KEY?: string

  // AWS MCP 서버 설정
  AWS_MCP_SERVER_URL?: string
  AWS_MCP_TIMEOUT?: string

  // 기타 설정
  NODE_ENV?: string
  NEXT_PUBLIC_APP_URL?: string
}
