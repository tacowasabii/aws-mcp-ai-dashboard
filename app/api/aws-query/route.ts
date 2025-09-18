import { NextRequest, NextResponse } from 'next/server'
import { AWSDirectClient, AWSCredentials } from '../../../lib/aws-client'

interface AWSQueryResponse {
  data?: string
  error?: string
  info?: string
}

export async function POST(request: NextRequest) {
  let body: any = {}
  try {
    body = await request.json()
    const { query, credentials }: { query: string, credentials: AWSCredentials } = body

    // AWS 자격증명 검증
    if (!credentials?.accessKeyId || !credentials?.secretAccessKey || !credentials?.region) {
      return NextResponse.json(
        { error: 'AWS 자격 증명이 필요합니다 (Access Key ID, Secret Access Key, Region)' },
        { status: 400 }
      )
    }

    if (!query || query.trim() === '') {
      return NextResponse.json(
        { error: '질문을 입력해주세요' },
        { status: 400 }
      )
    }

    console.log('🚀 Bedrock LLM + AWS SDK 통합 조회 시작...')

    // AWS SDK + Bedrock LLM 통합 클라이언트로 처리
    const awsClient = new AWSDirectClient(credentials)
    const response = await awsClient.processQuery(query)

    if (response.success) {
      const info = response.usedLLM
        ? '✅ Bedrock LLM이 AWS 데이터를 분석하여 답변했습니다'
        : '✅ AWS SDK를 통해 직접 조회되었습니다'

      const result: AWSQueryResponse = {
        data: response.data,
        info: info
      }
      return NextResponse.json(result)
    } else {
      throw new Error(response.error || 'AWS 조회 실패')
    }

  } catch (error: any) {
    console.error('❌ Bedrock LLM + AWS SDK 조회 실패:', error)

    let errorMessage = 'AWS 조회 중 오류가 발생했습니다'

    // AWS SDK 오류 처리
    if (error.name === 'CredentialsProviderError') {
      errorMessage = 'AWS 자격 증명이 올바르지 않습니다'
    } else if (error.name === 'UnauthorizedOperation') {
      errorMessage = 'AWS 권한이 부족합니다'
    } else if (error.message?.includes('InvalidUserID.NotFound')) {
      errorMessage = 'AWS 자격 증명이 유효하지 않습니다'
    } else if (error.message?.includes('SignatureDoesNotMatch')) {
      errorMessage = 'AWS Secret Key가 올바르지 않습니다'
    } else if (error.message?.includes('access denied') || error.message?.includes('AccessDenied')) {
      errorMessage = 'AWS 리소스에 대한 액세스 권한이 없습니다. IAM 권한을 확인해주세요.'
    } else if (error.message?.includes('InvalidAccessKeyId')) {
      errorMessage = 'AWS Access Key ID가 올바르지 않습니다'
    } else if (error.message?.includes('Bedrock')) {
      errorMessage = `Bedrock LLM 연동 오류: ${error.message}. 시뮬레이션 모드로 동작합니다.`
    } else if (error.message) {
      errorMessage = error.message
    }

    const errorResult: AWSQueryResponse = {
      data: errorMessage,
      error: errorMessage,
      info: '⚠️ Bedrock LLM + AWS SDK 연동 중 문제가 발생했습니다.'
    }

    return NextResponse.json(errorResult, { status: 500 })
  }
}

