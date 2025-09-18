import { NextRequest, NextResponse } from 'next/server'
import { pureMCPClient } from '../../../lib/pure-mcp-client'
import { MCPAWSCredentials } from '../../../lib/mcp-credential-manager'
import { AWSQueryResponse } from '../../../types'

export async function POST(request: NextRequest) {
  let body: any = {}
  try {
    body = await request.json()
    const { query, credentials }: { query: string, credentials: MCPAWSCredentials } = body
    
    // MCP용 자격증명 검증
    if (!credentials?.accessKeyId || !credentials?.secretAccessKey) {
      return NextResponse.json(
        { error: 'AWS 자격 증명이 필요합니다 (MCP용)' },
        { status: 400 }
      )
    }
    
    if (!query || query.trim() === '') {
      return NextResponse.json(
        { error: '질문을 입력해주세요' },
        { status: 400 }
      )
    }

    console.log('🚀 Pure LLM + AWS MCP 시스템 시작...')

    // Pure MCP 클라이언트로 LLM + MCP 통합 쿼리 처리
    const response = await pureMCPClient.queryAWSResources(credentials, query)
    
    if (response.success) {
      const result: AWSQueryResponse = {
        data: response.answer || response.data,
        info: '✅ LLM + AWS MCP 시스템을 통해 처리되었습니다'
      }
      return NextResponse.json(result)
    } else {
      throw new Error(response.error || 'LLM + MCP 처리 실패')
    }

  } catch (error: any) {
    console.error('❌ LLM + AWS MCP 시스템 실패:', error)

    let errorMessage = 'LLM + MCP 시스템 처리 실패'

    // LLM API 환경변수 오류
    if (error.message?.includes('LLM API 키가 설정되지 않았습니다')) {
      errorMessage = 'LLM API 키가 서버에 설정되지 않았습니다. 관리자에게 문의하세요.'
    }
    // MCP 자격증명 오류
    else if (error.name === 'CredentialsProviderError') {
      errorMessage = 'AWS 자격 증명이 올바르지 않습니다 (MCP용)'
    } else if (error.name === 'UnauthorizedOperation') {
      errorMessage = 'AWS 권한이 부족합니다'
    } else if (error.message?.includes('InvalidUserID.NotFound')) {
      errorMessage = 'AWS 자격 증명이 유효하지 않습니다'
    } else if (error.message?.includes('SignatureDoesNotMatch')) {
      errorMessage = 'AWS Secret Key가 올바르지 않습니다'
    } else if (error.message?.includes('access denied')) {
      errorMessage = 'AWS 리소스에 대한 액세스 권한이 없습니다. IAM 권한을 확인해주세요.'
    } else if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch')) {
      errorMessage = 'MCP 서버에 연결할 수 없습니다. MCP 서버가 실행 중인지 확인해주세요.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    const errorResult: AWSQueryResponse = {
      data: errorMessage, // AWSQueryResponse requires data field
      error: errorMessage,
      code: error.Code || error.name || 'UnknownError',
      fallback: getFallbackResponse(body.query),
      info: '⚠️ LLM + MCP 연동 중 문제가 발생했습니다. 시스템 상태를 확인해주세요.'
    }
    
    return NextResponse.json(errorResult, { status: 500 })
  }
}

// LLM + MCP 실패시 폴백 응답
function getFallbackResponse(query: string): string {
  const queryLower = query.toLowerCase()

  if (queryLower.includes('ec2') || queryLower.includes('인스턴스')) {
    return `EC2 인스턴스 정보를 조회하려고 했지만 LLM + MCP 시스템에 문제가 발생했습니다.`
  }

  if (queryLower.includes('s3') || queryLower.includes('버킷')) {
    return `S3 버킷 정보를 조회하려고 했지만 LLM + MCP 시스템에 문제가 발생했습니다.`
  }

  if (queryLower.includes('계정') || queryLower.includes('account')) {
    return `AWS 계정 정보를 조회하려고 했지만 LLM + MCP 시스템에 문제가 발생했습니다.`
  }

  return `LLM + AWS MCP 통합 시스템이 일시적으로 사용할 수 없습니다.

🔧 해결 방법:
1. LLM API 키 환경변수 확인 (OPENAI_API_KEY 또는 ANTHROPIC_API_KEY)
2. AWS MCP 서버 상태 확인
3. 사용자 AWS 자격증명 확인

📋 지원되는 질문:
- "EC2 인스턴스 현황 보여줘"
- "S3 버킷 목록 알려줘"
- "내 AWS 계정 정보 확인해줘"
- "비용 분석해줘"
- "보안 상태 확인해줘"`
}
