import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { AzureAgentClient, WorkPlanRequest, getAzureAgentConfig } from './azure-agent-client'

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
  private azureAgent: AzureAgentClient | null = null

  constructor(config: BedrockLLMConfig) {
    this.client = new BedrockRuntimeClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    })
    this.modelId = config.modelId
    
    // Azure Agent 초기화
    const azureConfig = getAzureAgentConfig()
    if (azureConfig) {
      this.azureAgent = new AzureAgentClient(azureConfig)
    }
  }

  /**
   * 사용자 쿼리에서 작업계획서 생성 의도 파악
   */
  private detectWorkPlanIntent(query: string): boolean {
    const workPlanKeywords = [
      '작업계획서', '워크플로우', '계획서', '작업 계획', 
      'workflow', 'work plan', '단계별', '절차', 
      'cli 명령', 'aws cli', '스크립트'
    ];
    
    const queryLower = query.toLowerCase();
    return workPlanKeywords.some(keyword => queryLower.includes(keyword.toLowerCase()));
  }

  /**
   * 리소스 타입 추출
   */
  private extractResourceType(query: string, awsData?: any): 'ec2' | 'eks' | 'vpc' | 'general' {
    const queryLower = query.toLowerCase();
    
    if ((queryLower.includes('ec2') || queryLower.includes('인스턴스') || queryLower.includes('서버')) && awsData) {
      return 'ec2';
    }
    if ((queryLower.includes('eks') || queryLower.includes('클러스터') || queryLower.includes('쿠버네티스')) && awsData) {
      return 'eks';
    }
    if ((queryLower.includes('vpc') || queryLower.includes('네트워크') || queryLower.includes('서브넷')) && awsData) {
      return 'vpc';
    }
    
    return 'general';
  }

  /**
   * AWS 전문가로서 질문에 답변 (실제 AWS 데이터 포함) + 작업계획서 생성
   */
  async answerWithAWSData(
    query: string,
    userRegion: string,
    awsData?: any
  ): Promise<LLMResponse> {
    // 작업계획서 생성 의도 확인
    if (this.detectWorkPlanIntent(query) && this.azureAgent) {
      console.log('🎯 작업계획서 생성 의도 감지됨, Azure Agent 호출...');
      
      try {
        const resourceType = this.extractResourceType(query, awsData);
        
        const workPlanRequest: WorkPlanRequest = {
          resourceType,
          resourceInfo: awsData || {},
          userRequest: query,
          awsRegion: userRegion
        };
        
        const workPlanResult = await this.azureAgent.generateWorkPlan(workPlanRequest);
        
        if (workPlanResult.success) {
          const combinedResponse = `📋 **작업계획서 생성 완료**

${workPlanResult.workPlan}

---

🤖 *Azure AI Agent가 생성한 작업계획서입니다.*
*Thread ID: ${workPlanResult.threadId}*`;
          
          return {
            success: true,
            answer: combinedResponse
          };
        } else {
          console.warn('Azure Agent 실패, 일반 LLM 응답으로 폴백:', workPlanResult.error);
          // 폴백: 일반 LLM 응답
        }
      } catch (error: any) {
        console.warn('Azure Agent 오류, 일반 LLM 응답으로 폴백:', error);
        // 폴백: 일반 LLM 응답
      }
    }
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
   * AWS 에러 분석 및 사용자 친화적 메시지 생성
   */
  async analyzeAWSError(errorMessage: string, userRegion: string, context?: string): Promise<LLMResponse> {
    const systemPrompt = `당신은 AWS 에러 분석 전문가입니다.

역할:
1. AWS API 에러 메시지를 분석하여 원인을 파악
2. 사용자가 이해하기 쉬운 한국어로 설명
3. 구체적이고 실행 가능한 해결 방법 제시
4. 권한, 설정, 자격증명 문제를 명확히 구분

에러 분석 시 고려사항:
- 권한 부족: 필요한 IAM 권한과 해결 방법
- 자격증명 문제: Access Key, Secret Key, 토큰 관련 이슈
- 서비스 제한: 리전별 제한, 서비스 가용성
- 네트워크/연결: 엔드포인트, VPC 설정 문제
- 리소스 상태: 존재하지 않는 리소스, 잘못된 ID

사용자 AWS 리전: ${userRegion}
컨텍스트: ${context || 'AWS 리소스 조회 시도'}

답변 형식:
1. 🔍 **문제 원인**: 간단명료한 원인 설명
2. 💡 **해결 방법**: 구체적인 단계별 해결책
3. 📋 **추가 정보**: 관련 문서나 추가 도움말 (필요시)

답변은 친근하고 도움이 되는 톤으로 작성하세요.`

    const userPrompt = `다음 AWS 에러를 분석하고 사용자가 이해하기 쉽게 설명해주세요:

에러 메시지: "${errorMessage}"

이 에러의 원인과 해결 방법을 명확하게 설명해주세요.`

    return await this.callBedrock(systemPrompt, userPrompt)
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
          answer: `🖥️ **EC2 인스턴스 분석** (시뮬레이션)

${userRegion} 리전의 EC2 인스턴스 현황을 분석했습니다.

${JSON.stringify(awsData, null, 2)}

**권장사항:**
- 사용하지 않는 인스턴스는 중지하여 비용을 절약하세요
- 적절한 인스턴스 타입을 선택하여 성능을 최적화하세요

*실제 Bedrock 연결 후 더 상세한 분석이 제공됩니다.*`
        }
      }

      if (queryLower.includes('eks') || queryLower.includes('클러스터')) {
        return {
          success: true,
          answer: `⚓ **EKS 클러스터 분석** (시뮬레이션)

${userRegion} 리전의 EKS 클러스터 현황을 분석했습니다.

${JSON.stringify(awsData, null, 2)}

**권장사항:**
- 클러스터 버전을 최신으로 유지하세요
- 적절한 노드 그룹 설정을 확인하세요

*실제 Bedrock 연결 후 더 상세한 분석이 제공됩니다.*`
        }
      }

      if (queryLower.includes('vpc') || queryLower.includes('네트워크')) {
        return {
          success: true,
          answer: `🌐 **VPC 네트워크 분석** (시뮬레이션)

${userRegion} 리전의 VPC 네트워크 현황을 분석했습니다.

${JSON.stringify(awsData, null, 2)}

**권장사항:**
- 보안 그룹 설정을 정기적으로 검토하세요
- 서브넷 구성이 적절한지 확인하세요

*실제 Bedrock 연결 후 더 상세한 분석이 제공됩니다.*`
        }
      }
    }

    // 일반적인 AWS 질문
    return {
      success: true,
      answer: `☁️ **AWS 전문 상담** (시뮬레이션)

질문: "${query}"

**현재 구성:**
- 리전: ${userRegion}
- 지원 서비스: EC2, EKS, VPC (실시간 데이터)

**답변:**
AWS에 대한 질문을 해주셔서 감사합니다. 현재 시뮬레이션 모드로 동작 중입니다.

EC2, EKS, VPC에 대한 구체적인 질문을 하시면 실제 AWS 데이터를 조회하여 상세한 분석을 제공해드릴 수 있습니다.

**예시 질문:**
- "EC2 인스턴스 현황 보여줘"
- "EKS 클러스터 상태 확인해줘"
- "VPC 네트워크 구성 분석해줘"

*실제 Bedrock 연결 후 모든 AWS 서비스에 대한 전문적인 답변이 제공됩니다.*`
    }
  }

  /**
   * 에러 시뮬레이션 응답 (Bedrock 사용 불가시)
   */
  getSimulationErrorResponse(errorMessage: string, userRegion: string): LLMResponse {
    // 기본적인 에러 패턴 분석
    if (errorMessage.includes('not authorized to perform')) {
      const match = errorMessage.match(/not authorized to perform: ([^\s]+)/)
      const action = match ? match[1] : '해당 작업'

      return {
        success: true,
        answer: `🔍 **문제 원인** (시뮬레이션 분석)

현재 AWS 계정에 **${action}** 권한이 없습니다.

💡 **해결 방법**
1. AWS IAM 콘솔에서 사용자 권한 확인
2. 관리자에게 **${action}** 권한 요청
3. 정책에서 명시적 거부(Deny) 규칙 확인

📋 **추가 정보**
리전: ${userRegion}
필요 권한: ${action}

*실제 Bedrock LLM 연결 시 더 상세한 분석과 해결책을 제공합니다.*`
      }
    }

    if (errorMessage.includes('InvalidAccessKeyId')) {
      return {
        success: true,
        answer: `🔍 **문제 원인** (시뮬레이션 분석)

AWS Access Key ID가 올바르지 않거나 존재하지 않습니다.

💡 **해결 방법**
1. AWS 콘솔에서 새로운 Access Key 생성
2. 기존 키가 삭제되었는지 확인
3. 올바른 계정의 키를 사용하고 있는지 확인

📋 **추가 정보**
리전: ${userRegion}

*실제 Bedrock LLM 연결 시 더 정확한 진단을 제공합니다.*`
      }
    }

    // 기본 시뮬레이션 응답
    return {
      success: true,
      answer: `🔍 **문제 원인** (시뮬레이션 분석)

AWS API 호출 중 오류가 발생했습니다.

💡 **일반적인 해결 방법**
1. AWS 자격증명 확인
2. 필요한 권한 확인
3. 네트워크 연결 상태 확인
4. AWS 서비스 상태 페이지 확인

📋 **상세 오류 메시지**
${errorMessage}

*실제 Bedrock LLM이 연결되면 더 구체적인 분석과 맞춤형 해결책을 제공합니다.*`
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