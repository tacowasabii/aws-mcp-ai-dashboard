import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential, ClientSecretCredential } from "@azure/identity";

export interface AzureAgentConfig {
  projectUrl: string;
  agentId: string;
}

export interface WorkPlanRequest {
  resourceType: 'ec2' | 'eks' | 'vpc' | 'general';
  resourceInfo: any;
  userRequest: string;
  awsRegion: string;
}

export interface WorkPlanResponse {
  success: boolean;
  workPlan?: string;
  threadId?: string;
  error?: string;
}

export class AzureAgentClient {
  private client: AIProjectClient;
  private agentId: string;

  constructor(config: AzureAgentConfig) {
    // 인증 방법 결정
    let credential;
    
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    
    if (tenantId && clientId && clientSecret) {
      console.log('🔑 Azure 서비스 주체 인증 사용');
      credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    } else {
      console.log('🔑 Azure 기본 인증 체인 사용 (Azure CLI 또는 관리 ID)');
      credential = new DefaultAzureCredential();
    }
    
    this.client = new AIProjectClient(
      config.projectUrl,
      credential
    );
    this.agentId = config.agentId;
  }

  /**
   * AWS 리소스 정보를 바탕으로 작업계획서 생성 (수정된 Azure AI Projects 방식)
   */
  async generateWorkPlan(request: WorkPlanRequest): Promise<WorkPlanResponse> {
    try {
      console.log('🤖 Azure AI Agent로 작업계획서 생성 시작...');

      // 에이전트 가져오기
      const agent = await this.client.agents.getAgent(this.agentId);
      console.log(`✅ 에이전트 연결: ${agent.name}`);

      // 새 스레드 생성
      const thread = await this.client.agents.threads.create();
      console.log(`✅ 스레드 생성: ${thread.id}`);

      // AWS 리소스 정보를 포함한 메시지 구성
      const messageContent = this.buildWorkPlanMessage(request);

      // 메시지 전송
      const message = await this.client.agents.messages.create(
        thread.id,
        "user",
        messageContent
      );
      console.log(`✅ 메시지 전송: ${message.id}`);

      // Azure AI Projects에서는 명시적으로 Run을 생성해야 할 수 있음
      console.log('🔄 Azure Agent Run 생성 시도...');
      
      let run;
      try {
        // 다양한 형식으로 Run 생성 시도
        try {
          run = await this.client.agents.runs.create(thread.id, {
            assistant_id: this.agentId
          });
          console.log('✅ Run 생성 성공 (assistant_id 방식)');
        } catch {
          try {
            run = await this.client.agents.runs.create(thread.id, {
              agent_id: this.agentId
            });
            console.log('✅ Run 생성 성공 (agent_id 방식)');
          } catch {
            // 마지막으로 문자열로 시도
            run = await this.client.agents.runs.create(thread.id, this.agentId);
            console.log('✅ Run 생성 성공 (문자열 방식)');
          }
        }
      } catch (runError: any) {
        console.warn('⚠️ Run 생성 실패, 자동 실행 기대:', runError.message);
        run = null;
      }

      // Run이 있는 경우 완료 대기
      if (run) {
        console.log(`⏰ Run ${run.id} 완료 대기 중...`);
        let runStatus = await this.client.agents.runs.get(thread.id, run.id);
        let runAttempts = 0;
        const maxRunAttempts = 30; // 최대 30번 시도 (60초)
        
        while ((runStatus.status === "queued" || runStatus.status === "in_progress") && runAttempts < maxRunAttempts) {
          await this.sleep(2000); // 2초 대기
          runAttempts++;
          runStatus = await this.client.agents.runs.get(thread.id, run.id);
          console.log(`🔍 Run 상태 확인 ${runAttempts}/${maxRunAttempts}: ${runStatus.status}`);
        }
        
        if (runStatus.status !== "completed") {
          throw new Error(`Run이 완료되지 않았습니다. 최종 상태: ${runStatus.status}`);
        }
        
        console.log('✅ Run 완료!');
      }

      // 페이지네이션된 메시지 리스트 처리
      console.log('📨 메시지 리스트 조회 중...');
      
      const messagesList = [];
      const messagesIterable = this.client.agents.messages.list(thread.id);
      
      try {
        // PagedAsyncIterableIterator를 사용하여 모든 메시지 수집
        for await (const message of messagesIterable) {
          messagesList.push(message);
        }
      } catch (iterError: any) {
        console.warn('⚠️ 메시지 이터레이션 실패:', iterError.message);
        
        // 대안: 첫 번째 페이지만 가져오기
        try {
          const firstPage = await messagesIterable.next();
          if (firstPage.value) {
            messagesList.push(...firstPage.value);
          }
        } catch (pageError: any) {
          console.warn('⚠️ 첫 페이지 조회도 실패:', pageError.message);
        }
      }
      
      console.log(`📝 총 ${messagesList.length}개 메시지 발견`);
      
      if (messagesList.length === 0) {
        throw new Error('메시지를 조회할 수 없습니다.');
      }
      
      // 메시지 역할 확인
      messagesList.forEach((msg, index) => {
        console.log(`메시지 ${index}: role=${msg.role}, id=${msg.id}`);
      });
      
      // Assistant 메시지 찾기 (가장 최근것)
      const assistantMessages = messagesList.filter(msg => msg.role === 'assistant');
      
      if (assistantMessages.length === 0) {
        throw new Error('Assistant의 응답을 찾을 수 없습니다.');
      }
      
      // 가장 최근 assistant 메시지 사용 (시간순 정렬)
      const latestAssistantMessage = assistantMessages.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      
      console.log('✅ Assistant 메시지 발견:', latestAssistantMessage.id);

      // 에이전트 응답에서 텍스트 추출
      let workPlan = '';
      if (latestAssistantMessage.content && Array.isArray(latestAssistantMessage.content)) {
        workPlan = latestAssistantMessage.content
          .filter(content => content.type === "text")
          .map(content => content.text?.value || content.text)
          .join("\n");
      } else if (typeof latestAssistantMessage.content === 'string') {
        workPlan = latestAssistantMessage.content;
      } else {
        console.log('Assistant 메시지 content 구조:', latestAssistantMessage.content);
        workPlan = JSON.stringify(latestAssistantMessage.content);
      }

      if (!workPlan || workPlan.trim() === '') {
        throw new Error('Assistant 응답이 비어있습니다.');
      }

      console.log('✅ 작업계획서 생성 완료');
      
      return {
        success: true,
        workPlan: workPlan,
        threadId: thread.id
      };

    } catch (error: any) {
      console.error('❌ Azure AI Agent 오류:', error);
      return {
        success: false,
        error: `작업계획서 생성 실패: ${error.message}`
      };
    }
  }

  /**
   * 작업계획서 요청을 위한 메시지 구성
   */
  private buildWorkPlanMessage(request: WorkPlanRequest): string {
    const { resourceType, resourceInfo, userRequest, awsRegion } = request;

    let resourceSummary = '';
    
    // 리소스 타입별 요약 정보 생성
    switch (resourceType) {
      case 'ec2':
        resourceSummary = `
**EC2 인스턴스 현황:**
- 총 인스턴스: ${resourceInfo.totalInstances || 0}개
- 실행 중: ${resourceInfo.runningInstances || 0}개
- 중지됨: ${resourceInfo.stoppedInstances || 0}개
- 리전: ${awsRegion}

인스턴스 상세:
${JSON.stringify(resourceInfo.instances || [], null, 2)}`;
        break;

      case 'eks':
        resourceSummary = `
**EKS 클러스터 현황:**
- 총 클러스터: ${resourceInfo.totalClusters || 0}개
- 활성 클러스터: ${resourceInfo.activeClusters || 0}개
- 리전: ${awsRegion}

클러스터 상세:
${JSON.stringify(resourceInfo.clusters || [], null, 2)}`;
        break;

      case 'vpc':
        resourceSummary = `
**VPC 네트워크 현황:**
- 총 VPC: ${resourceInfo.totalVPCs || 0}개
- 기본 VPC: ${resourceInfo.defaultVPCs || 0}개
- 총 서브넷: ${resourceInfo.totalSubnets || 0}개
- 리전: ${awsRegion}

네트워크 상세:
${JSON.stringify({ vpcs: resourceInfo.vpcs || [], subnets: resourceInfo.subnets || [] }, null, 2)}`;
        break;

      default:
        resourceSummary = `
**AWS 리소스 정보:**
리전: ${awsRegion}
데이터: ${JSON.stringify(resourceInfo, null, 2)}`;
    }

    return `
안녕하세요! AWS 작업계획서를 생성해주세요.

**사용자 요청:**
${userRequest}

**현재 AWS 리소스 상황:**
${resourceSummary}

**요청사항:**
위의 AWS 리소스 정보를 바탕으로 사용자의 요청을 수행하는 단계별 AWS CLI 작업계획서를 작성해주세요.

계획서에는 다음을 포함해주세요:
1. 작업 개요 및 목적
2. 사전 준비사항 (백업, 권한 확인 등)
3. 단계별 AWS CLI 명령어와 설명
4. 각 단계별 확인 방법
5. 주의사항 및 롤백 방법

실행 가능하고 안전한 명령어들로 구성해주세요.
`;
  }

  /**
   * 지정된 시간만큼 대기
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 기존 스레드에 추가 질문 (Azure AI Projects 방식)
   */
  async continueConversation(threadId: string, question: string): Promise<WorkPlanResponse> {
    try {
      const message = await this.client.agents.messages.create(threadId, "user", question);
      
      // 대기 시간 (에이전트 응답 대기 - 폴링 방식)
      let agentMessages = [];
      let attempts = 0;
      const maxAttempts = 10; // 최대 10번 시도 (30초)
      
      while (agentMessages.length === 0 && attempts < maxAttempts) {
        await this.sleep(3000); // 3초 대기
        attempts++;
        
        try {
          const messages = await this.client.agents.messages.list(threadId);
          
          // API 응답 구조 확인 및 대응
          let messagesList;
          if (Array.isArray(messages)) {
            messagesList = messages;
          } else if (messages.data && Array.isArray(messages.data)) {
            messagesList = messages.data;
          } else if (messages.messages && Array.isArray(messages.messages)) {
            messagesList = messages.messages;
          } else {
            console.warn('⚠️ 예상치 못한 API 응답 구조:', messages);
            messagesList = [];
          }
          
          if (messagesList.length > 0) {
            agentMessages = messagesList.filter(msg => 
              msg.role === 'assistant' && 
              msg.createdAt && message.createdAt &&
              new Date(msg.createdAt).getTime() > new Date(message.createdAt).getTime()
            );
          }
          
        } catch (listError: any) {
          console.warn(`⚠️ 메시지 리스트 오류 (${attempts}/${maxAttempts}):`, listError.message);
        }
        
        console.log(`🔍 에이전트 응답 확인 시도 ${attempts}/${maxAttempts}... 찾은 메시지: ${agentMessages.length}개`);
      }
      
      if (agentMessages.length === 0) {
        throw new Error('에이전트의 응답을 받지 못했습니다.');
      }
      
      const latestAgentMessage = agentMessages[0];
      const response = latestAgentMessage.content
        .filter(content => content.type === "text")
        .map(content => content.text?.value)
        .join("\n");

      return {
        success: true,
        workPlan: response,
        threadId: threadId
      };

    } catch (error: any) {
      return {
        success: false,
        error: `추가 질문 처리 실패: ${error.message}`
      };
    }
  }
}

/**
 * Azure Agent 설정을 환경변수에서 가져오기
 */
export function getAzureAgentConfig(): AzureAgentConfig | null {
  const projectUrl = process.env.AZURE_AI_PROJECT_URL;
  const agentId = process.env.AZURE_AI_AGENT_ID;

  if (!projectUrl || !agentId) {
    console.warn('⚠️ Azure AI Agent 환경변수가 설정되지 않았습니다.');
    return null;
  }

  return {
    projectUrl,
    agentId
  };
}
