// AWS 관련 타입들
export interface AWSCredentials {
  accessKeyId: string
  secretAccessKey: string
  region?: string
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

export interface EKSCluster {
  name: string
  status: string
  version: string
  endpoint?: string
  createdAt?: Date
  roleArn?: string
}

export interface VPCInfo {
  vpcId: string
  cidrBlock: string
  state: string
  isDefault: boolean
  tags?: Record<string, string>
}

export interface SubnetInfo {
  subnetId: string
  vpcId: string
  cidrBlock: string
  availabilityZone: string
  state: string
  tags?: Record<string, string>
}

export interface AWSAccountInfo {
  accountId: string
  arn: string
  userId: string
  region: string
}

// 채팅 관련 타입들
export interface ChatMessage {
  id: string
  type: 'user' | 'ai' | 'system' | 'error'
  content: string
  timestamp: Date
  accountId?: string
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