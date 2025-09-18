import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

export interface BedrockLLMConfig {
  region: string
  accessKeyId: string
  secretAccessKey: string
  modelId: string
}

export interface LLMResponse {
  success: boolean
  answer: string
  error?: string
  tokensUsed?: number
}

export class BedrockLLMClient {
  private client: BedrockRuntimeClient
  private modelId: string

  constructor(config: BedrockLLMConfig) {
    this.client = new BedrockRuntimeClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    })
    this.modelId = config.modelId
  }

  /**
   * AWS 전문가로서 질문에 답변 (실제 AWS 데이터 포함)
   */
  async answerWithAWSData(
    query: string,
    userRegion: string,
    awsData?: any
  ): Promise<LLMResponse> {
    const systemPrompt = `당신은 AWS 전문 어시스턴트입니다. 사용자의 질문에 대해 도움이 되는 답변을 제공하세요.

역할:
1. AWS 리소스 및 서비스에 대한 전문적인 답변 제공
2. 실제 AWS 데이터가 제공된 경우 이를 분석하여 인사이트 제공
3. AWS 모범 사례 및 권장사항 제시
4. 항상 한국어로 답변

지원 가능한 AWS 서비스:
- EC2 (인스턴스, 서버)
- EKS (클러스터, 쿠버네티스)
- VPC (네트워킹, 서브넷)
- 일반적인 AWS 질문

사용자 AWS 리전: ${userRegion}

실제 AWS 데이터: ${awsData ? JSON.stringify(awsData, null, 2) : '없음'}

답변 시 다음을 포함하세요:
- 명확하고 실용적인 정보
- 관련된 AWS 모범 사례
- 가능한 경우 구체적인 권장사항
- 적절한 이모지 사용으로 가독성 향상`

    const userPrompt = awsData
      ? `위의 실제 AWS 데이터를 바탕으로 다음 질문에 답변해주세요: "${query}"`
      : `다음 AWS 관련 질문에 답변해주세요: "${query}"`

    return await this.callBedrock(systemPrompt, userPrompt)
  }

  /**
   * 일반적인 AWS 질문 답변 (데이터 없이)
   */
  async answerGeneralAWS(query: string, userRegion: string): Promise<LLMResponse> {
    const systemPrompt = `당신은 AWS 전문 어시스턴트입니다.

역할:
1. AWS 서비스, 개념, 모범 사례에 대한 전문적인 답변 제공
2. AWS 아키텍처 및 설계 가이드 제공
3. 비용 최적화 및 보안 권장사항 제시
4. 항상 한국어로 답변

사용자 AWS 리전: ${userRegion}

현재 이 시스템에서는 EC2, EKS, VPC 리소스에 대한 실시간 조회를 지원합니다.
다른 AWS 서비스에 대한 질문은 일반적인 정보와 가이드를 제공합니다.

답변 시 다음을 포함하세요:
- 명확하고 실용적인 정보
- 관련된 AWS 모범 사례
- 단계별 가이드 (필요한 경우)
- 적절한 이모지 사용으로 가독성 향상`

    return await this.callBedrock(systemPrompt, query)
  }

  /**
   * Bedrock Claude 호출
   */
  private async callBedrock(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const requestBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 2000,
      temperature: 0.1,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt
        }
      ]
    }

    try {
      console.log('🤖 Bedrock Claude 호출 중...')

      const command = new InvokeModelCommand({
        modelId: this.modelId,
        body: JSON.stringify(requestBody),
        contentType: 'application/json'
      })

      const response = await this.client.send(command)
      const responseBody = JSON.parse(new TextDecoder().decode(response.body))
      const answer = responseBody.content?.[0]?.text || '응답을 생성할 수 없습니다.'

      console.log('✅ Bedrock Claude 응답 수신')

      return {
        success: true,
        answer: answer,
        tokensUsed: responseBody.usage?.output_tokens
      }

    } catch (error: any) {
      console.error('❌ Bedrock API 오류:', error)

      return {
        success: false,
        answer: '',
        error: `Bedrock API 호출 실패: ${error.message}`
      }
    }
  }

  /**
   * 시뮬레이션 응답 (Bedrock 사용 불가시)
   */
  getSimulationResponse(query: string, userRegion: string, awsData?: any): LLMResponse {
    const queryLower = query.toLowerCase()

    if (awsData) {
      // AWS 데이터가 있는 경우
      if (queryLower.includes('ec2') || queryLower.includes('인스턴스')) {
        return {
          success: true,
          answer: `🖥️ **EC2 인스턴스 분석** (시뮬레이션)\n\n${userRegion} 리전의 EC2 인스턴스 현황을 분석했습니다.\n\n${JSON.stringify(awsData, null, 2)}\n\n**권장사항:**\n- 사용하지 않는 인스턴스는 중지하여 비용을 절약하세요\n- 적절한 인스턴스 타입을 선택하여 성능을 최적화하세요\n\n*실제 Bedrock 연결 후 더 상세한 분석이 제공됩니다.*`
        }
      }

      if (queryLower.includes('eks') || queryLower.includes('클러스터')) {
        return {
          success: true,
          answer: `⚓ **EKS 클러스터 분석** (시뮬레이션)\n\n${userRegion} 리전의 EKS 클러스터 현황을 분석했습니다.\n\n${JSON.stringify(awsData, null, 2)}\n\n**권장사항:**\n- 클러스터 버전을 최신으로 유지하세요\n- 적절한 노드 그룹 설정을 확인하세요\n\n*실제 Bedrock 연결 후 더 상세한 분석이 제공됩니다.*`
        }
      }

      if (queryLower.includes('vpc') || queryLower.includes('네트워크')) {
        return {
          success: true,
          answer: `🌐 **VPC 네트워크 분석** (시뮬레이션)\n\n${userRegion} 리전의 VPC 네트워크 현황을 분석했습니다.\n\n${JSON.stringify(awsData, null, 2)}\n\n**권장사항:**\n- 보안 그룹 설정을 정기적으로 검토하세요\n- 서브넷 구성이 적절한지 확인하세요\n\n*실제 Bedrock 연결 후 더 상세한 분석이 제공됩니다.*`
        }
      }
    }

    // 일반적인 AWS 질문
    return {
      success: true,
      answer: `☁️ **AWS 전문 상담** (시뮬레이션)\n\n질문: "${query}"\n\n**현재 구성:**\n- 리전: ${userRegion}\n- 지원 서비스: EC2, EKS, VPC (실시간 데이터)\n\n**답변:**\nAWS에 대한 질문을 해주셔서 감사합니다. 현재 시뮬레이션 모드로 동작 중입니다.\n\nEC2, EKS, VPC에 대한 구체적인 질문을 하시면 실제 AWS 데이터를 조회하여 상세한 분석을 제공해드릴 수 있습니다.\n\n**예시 질문:**\n- "EC2 인스턴스 현황 보여줘"\n- "EKS 클러스터 상태 확인해줘"\n- "VPC 네트워크 구성 분석해줘"\n\n*실제 Bedrock 연결 후 모든 AWS 서비스에 대한 전문적인 답변이 제공됩니다.*`
    }
  }
}

/**
 * Bedrock 설정을 환경변수에서 가져오기
 */
export function getBedrockConfig(): BedrockLLMConfig | null {
  const region = process.env.BEDROCK_REGION
  const accessKeyId = process.env.BEDROCK_ACCESS_KEY_ID
  const secretAccessKey = process.env.BEDROCK_SECRET_ACCESS_KEY
  const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0'

  if (!region || !accessKeyId || !secretAccessKey) {
    console.warn('⚠️ Bedrock 환경변수가 설정되지 않았습니다. 시뮬레이션 모드로 동작합니다.')
    return null
  }

  return {
    region,
    accessKeyId,
    secretAccessKey,
    modelId
  }
}