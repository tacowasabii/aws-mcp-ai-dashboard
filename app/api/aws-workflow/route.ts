import { NextRequest, NextResponse } from 'next/server'
import { AWSDirectClient, AWSCredentials } from '../../../lib/aws-client'
import { AzureAgentClient, getAzureAgentConfig } from '../../../lib/azure-agent-client'

interface AWSWorkflowResponse {
  data?: string
  workPlan?: string
  threadId?: string
  error?: string
  info?: string
  usedAzureAgent?: boolean
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

    console.log('🚀 통합 AWS 워크플로우 시작...')
    console.log('쿼리:', query)

    // 작업계획서 생성 의도 감지 (간단한 키워드 기반)
    const workPlanKeywords = [
      '작업계획서', '워크플로우', '계획서', '작업 계획', 
      'workflow', 'work plan', '단계별', '절차', 
      'cli 명령', 'aws cli', '스크립트'
    ]
    
    const needsWorkPlan = workPlanKeywords.some(keyword => 
      query.toLowerCase().includes(keyword.toLowerCase())
    )

    // AWS SDK + Bedrock LLM으로 리소스 조회
    const awsClient = new AWSDirectClient(credentials)
    const awsResponse = await awsClient.processQuery(query)

    if (!awsResponse.success) {
      throw new Error(awsResponse.error || 'AWS 조회 실패')
    }

    let workPlanResult: any = null
    let usedAzureAgent = false

    // 작업계획서가 필요한 경우 Azure Agent 호출
    if (needsWorkPlan) {
      console.log('📋 작업계획서 생성이 필요한 쿼리 감지됨')
      
      const azureConfig = getAzureAgentConfig()
      if (azureConfig) {
        try {
          const azureAgent = new AzureAgentClient(azureConfig)
          
          // 리소스 타입 결정
          let resourceType: 'ec2' | 'eks' | 'vpc' | 'general' = 'general'
          const queryLower = query.toLowerCase()
          
          if (queryLower.includes('ec2') || queryLower.includes('인스턴스') || queryLower.includes('서버')) {
            resourceType = 'ec2'
          } else if (queryLower.includes('eks') || queryLower.includes('클러스터') || queryLower.includes('쿠버네티스')) {
            resourceType = 'eks'
          } else if (queryLower.includes('vpc') || queryLower.includes('네트워크') || queryLower.includes('서브넷')) {
            resourceType = 'vpc'
          }

          // Azure Agent로 작업계획서 생성
          workPlanResult = await azureAgent.generateWorkPlan({
            resourceType,
            resourceInfo: awsResponse.data || {},
            userRequest: query,
            awsRegion: credentials.region
          })

          if (workPlanResult.success) {
            usedAzureAgent = true
            console.log('✅ Azure Agent 작업계획서 생성 완료')
          } else {
            console.warn('Azure Agent 실패:', workPlanResult.error)
          }

        } catch (error: any) {
          console.warn('Azure Agent 호출 중 오류:', error.message)
        }
      } else {
        console.warn('Azure AI 설정이 없습니다. 작업계획서 생성을 건너뜁니다.')
      }
    }

    // 응답 구성
    const result: AWSWorkflowResponse = {
      data: awsResponse.data,
      info: awsResponse.usedLLM 
        ? '✅ Bedrock LLM이 AWS 데이터를 분석하여 답변했습니다'
        : '✅ AWS SDK를 통해 직접 조회되었습니다'
    }

    // 작업계획서가 생성된 경우 추가
    if (usedAzureAgent && workPlanResult?.success) {
      result.workPlan = workPlanResult.workPlan
      result.threadId = workPlanResult.threadId
      result.usedAzureAgent = true
      result.info = '✅ AWS 데이터 조회 + Azure AI Agent 작업계획서 생성 완료'
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('❌ 통합 워크플로우 실패:', error)

    let errorMessage = 'AWS 워크플로우 처리 중 오류가 발생했습니다'

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
      errorMessage = `Bedrock LLM 연동 오류: ${error.message}`
    } else if (error.message?.includes('Azure')) {
      errorMessage = `Azure AI Agent 연동 오류: ${error.message}`
    } else if (error.message) {
      errorMessage = error.message
    }

    const errorResult: AWSWorkflowResponse = {
      data: errorMessage,
      error: errorMessage,
      info: '⚠️ 통합 워크플로우 처리 중 문제가 발생했습니다.'
    }

    return NextResponse.json(errorResult, { status: 500 })
  }
}
