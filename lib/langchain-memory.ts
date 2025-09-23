import { ConversationSummaryBufferMemory } from "langchain/memory";
import { ChatBedrockConverse } from "@langchain/aws";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

export interface ConversationContext {
  accountId: string; // AWS 계정 ID (실제 AWS 자격증명용)
  sessionId: string; // 대화 세션 ID
  awsRegion: string;
  lastQueries: string[];
  activeResources: string[];
  conversationPhase: 'initial' | 'followup' | 'troubleshooting';
}

export class AWSConversationMemory {
  private memories: Map<string, ConversationSummaryBufferMemory> = new Map();
  private contexts: Map<string, ConversationContext> = new Map();

  constructor(private llm: ChatBedrockConverse) {}

  // 세션별 메모리 초기화 (sessionId 직접 사용)
  async getOrCreateMemory(sessionId: string): Promise<ConversationSummaryBufferMemory> {
    if (!this.memories.has(sessionId)) {
      const memory = new ConversationSummaryBufferMemory({
        llm: this.llm,
        maxTokenLimit: 500, // 요약된 컨텍스트 최대 토큰 수
        returnMessages: true,
      });
      this.memories.set(sessionId, memory);
    }
    return this.memories.get(sessionId)!;
  }

  // sessionId에서 accountId 추출 헬퍼
  private extractAccountId(sessionId: string): string {
    return sessionId.includes('_conv_') ? sessionId.split('_conv_')[0] : sessionId;
  }

  // 컨텍스트 관리
  updateContext(sessionId: string, context: Partial<ConversationContext>) {
    const accountId = this.extractAccountId(sessionId);
    const existing = this.contexts.get(sessionId) || {
      accountId,
      sessionId,
      awsRegion: 'us-east-1',
      lastQueries: [],
      activeResources: [],
      conversationPhase: 'initial'
    };

    this.contexts.set(sessionId, { ...existing, ...context });
  }

  getContext(sessionId: string): ConversationContext | undefined {
    return this.contexts.get(sessionId);
  }

  // 메시지 추가 (자동 요약)
  async addMessage(sessionId: string, human: string, ai: string) {
    const memory = await this.getOrCreateMemory(sessionId);
    await memory.chatHistory.addMessage(new HumanMessage(human));
    await memory.chatHistory.addMessage(new AIMessage(ai));

    // 컨텍스트 업데이트
    const context = this.getContext(sessionId);
    if (context) {
      context.lastQueries = [...context.lastQueries.slice(-2), human]; // 최근 3개만 유지
      this.updateContext(sessionId, context);
    }
  }

  // 컨텍스트가 포함된 프롬프트 생성
  async getContextualPrompt(sessionId: string, newQuery: string): Promise<string> {
    const memory = await this.getOrCreateMemory(sessionId);
    const context = this.getContext(sessionId);

    // 메모리에서 압축된 대화 히스토리 가져오기
    const memoryVariables = await memory.loadMemoryVariables({});
    const chatHistory = memoryVariables.history || '';

    // AWS 특화 컨텍스트 구성
    const awsContext = context ? `
AWS 계정: ${context.accountId}
세션 ID: ${context.sessionId}
지역: ${context.awsRegion}
활성 리소스: ${context.activeResources.join(', ')}
대화 단계: ${context.conversationPhase}
최근 질문들: ${context.lastQueries.slice(-2).join(' → ')}
` : '';

    return `
당신은 AWS 전문가입니다. 사용자와의 대화 맥락을 고려하여 답변하세요.

${awsContext}

대화 히스토리 (요약됨):
${chatHistory}

현재 질문: ${newQuery}

답변해주세요:`;
  }

}

// 싱글톤 인스턴스
let memoryInstance: AWSConversationMemory | null = null;

export function getAWSMemory(llm: ChatBedrockConverse): AWSConversationMemory {
  if (!memoryInstance) {
    memoryInstance = new AWSConversationMemory(llm);
  }
  return memoryInstance;
}