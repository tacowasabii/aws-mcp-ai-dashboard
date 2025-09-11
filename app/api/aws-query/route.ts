import { NextRequest, NextResponse } from 'next/server'
import { AWSBedrockAgent } from '../../../lib/bedrock-agent'
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

    // Bedrock Agent 초기화 (Bedrock은 환경변수, MCP는 사용자 자격증명)
    const agent = new AWSBedrockAgent({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      region: credentials.region || 'us-east-1'
    })

    // AI가 사용자 질문을 분석하고 AWS MCP를 통해 응답 생성
    const response = await agent.processUserQuery(query)
    
    const result: AWSQueryResponse = { data: response }
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('AWS Bedrock Agent 실패:', error)
    
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
    } else if (error.message) {
      errorMessage = error.message
    }
    
    const errorResult: AWSQueryResponse = {
      error: errorMessage,
      code: error.Code || error.name || 'UnknownError',
      fallback: getFallbackResponse(body.query),
      info: 'Bedrock은 서버 환경변수로, MCP는 사용자 자격증명으로 분리되어 있습니다.'
    }
    
    return NextResponse.json(errorResult, { status: 500 })
  }
}

// Bedrock 실패시 폴백 응답
function getFallbackResponse(query: string): string {
  const queryLower = query.toLowerCase()
  
  if (queryLower.includes('ec2') || queryLower.includes('인스턴스')) {
    return `EC2 인스턴스 정보를 조회하려고 했지만 AI 에이전트에 문제가 발생했습니다. 
AWS 자격증명과 Bedrock 환경변수를 확인해주세요.`
  }
  
  if (queryLower.includes('s3') || queryLower.includes('버킷')) {
    return `S3 버킷 정보를 조회하려고 했지만 AI 에이전트에 문제가 발생했습니다. 
AWS 자격증명과 Bedrock 환경변수를 확인해주세요.`
  }
  
  if (queryLower.includes('계정') || queryLower.includes('account')) {
    return `AWS 계정 정보를 조회하려고 했지만 AI 에이전트에 문제가 발생했습니다. 
AWS 자격증명과 Bedrock 환경변수를 확인해주세요.`
  }
  
  return `AI 에이전트가 일시적으로 사용할 수 없습니다. 
서버 환경설정(Bedrock)과 사용자 자격증명(MCP)을 확인해주세요.

사용 가능한 API:
- /api/aws-test - MCP 자격증명 테스트
- /api/verify-aws - AWS 자격증명 검증`
}
