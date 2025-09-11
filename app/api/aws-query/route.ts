import { NextRequest, NextResponse } from 'next/server'
import { AWSBedrockAgentWithMCP } from '../../../lib/bedrock-agent-with-mcp'
import { AWSCredentials, AWSQueryResponse } from '../../../types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, credentials }: { query: string, credentials: AWSCredentials } = body
    
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

    console.log('🚀 실제 AWS MCP와 연동된 AI 에이전트 시작...')

    // 실제 MCP를 사용하는 Bedrock Agent 초기화
    const agent = new AWSBedrockAgentWithMCP({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      region: credentials.region || 'us-east-1'
    })

    // AI가 AWS MCP + 직접 AWS API를 통해 지능적 응답 생성
    const response = await agent.processUserQuery(query)
    
    const result: AWSQueryResponse = { 
      data: response,
      info: '✅ 실제 AWS MCP 서버와 연동되어 처리되었습니다'
    }
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ AWS MCP Bedrock Agent 실패:', error)
    
    let errorMessage = 'AI 에이전트 처리 실패'
    
    // Bedrock 환경변수 오류
    if (error.message?.includes('Bedrock 자격증명이 환경변수에 설정되지 않았습니다')) {
      errorMessage = 'Bedrock 자격증명이 서버에 설정되지 않았습니다. 관리자에게 문의하세요.'
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
      errorMessage = 'Bedrock 모델에 대한 액세스 권한이 없습니다. AWS 콘솔에서 모델 액세스를 활성화해주세요.'
    } else if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch')) {
      errorMessage = 'MCP 서버에 연결할 수 없습니다. MCP 서버가 실행 중인지 확인해주세요.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    const errorResult: AWSQueryResponse = {
      error: errorMessage,
      code: error.Code || error.name || 'UnknownError',
      fallback: getFallbackResponse(body.query),
      info: '⚠️ MCP 연동 중 문제가 발생했습니다. MCP 서버(포트 3001) 상태를 확인해주세요.'
    }
    
    return NextResponse.json(errorResult, { status: 500 })
  }
}

// MCP/Bedrock 실패시 폴백 응답
function getFallbackResponse(query: string): string {
  const queryLower = query.toLowerCase()
  
  if (queryLower.includes('ec2') || queryLower.includes('인스턴스')) {
    return `EC2 인스턴스 정보를 조회하려고 했지만 MCP 서버에 문제가 발생했습니다. 
MCP 서버를 시작하려면: npm run mcp-server`
  }
  
  if (queryLower.includes('s3') || queryLower.includes('버킷')) {
    return `S3 버킷 정보를 조회하려고 했지만 MCP 서버에 문제가 발생했습니다. 
MCP 서버를 시작하려면: npm run mcp-server`
  }
  
  if (queryLower.includes('계정') || queryLower.includes('account')) {
    return `AWS 계정 정보를 조회하려고 했지만 MCP 서버에 문제가 발생했습니다. 
MCP 서버를 시작하려면: npm run mcp-server`
  }
  
  return `실제 AWS MCP 서버와 연동된 AI 에이전트가 일시적으로 사용할 수 없습니다.

🔧 해결 방법:
1. MCP 서버 시작: npm run mcp-server
2. 서버 환경변수 확인 (Bedrock 자격증명)
3. 사용자 AWS 자격증명 확인

📋 지원되는 질문:
- "EC2 인스턴스 현황 보여줘"
- "S3 버킷 목록 알려줘"  
- "내 AWS 계정 정보 확인해줘"`
}
