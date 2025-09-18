import { NextRequest, NextResponse } from 'next/server'
import { AWSDirectClient, AWSCredentials } from '../../../lib/aws-client'
import { ChatBedrockConverse } from "@langchain/aws"
import { getAWSMemory } from '@/lib/langchain-memory'

interface AWSQueryResponse {
  data?: string
  error?: string
  info?: string
}

export async function POST(request: NextRequest) {
  let body: any = {}
  try {
    body = await request.json()
    const { query, credentials, accountId }: { query: string, credentials: AWSCredentials, accountId: string } = body

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

    // LangChain 메모리 초기화
    const llm = new ChatBedrockConverse({
      model: "anthropic.claude-3-haiku-20240307-v1:0",
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    })

    const memory = getAWSMemory(llm)

    // 컨텍스트 업데이트
    memory.updateContext(accountId || 'default', {
      awsRegion: credentials.region,
      conversationPhase: 'followup'
    })

    // 컨텍스트가 포함된 프롬프트 생성
    const contextualPrompt = await memory.getContextualPrompt(accountId || 'default', query)

    // AWS SDK + Bedrock LLM 통합 클라이언트로 처리
    const awsClient = new AWSDirectClient(credentials)
    const response = await awsClient.processQuery(contextualPrompt)

    if (response.success) {
      // 성공한 대화를 메모리에 저장
      await memory.addMessage(accountId || 'default', query, response.data)

      const info = response.usedLLM
        ? '✅ Bedrock LLM이 대화 맥락을 고려하여 AWS 데이터를 분석했습니다'
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

