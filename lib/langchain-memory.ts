import { ConversationSummaryBufferMemory } from "langchain/memory";
import { ChatBedrockConverse } from "@langchain/aws";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";

export interface ConversationContext {
  accountId: string;
  awsRegion: string;
  lastQueries: string[];
  activeResources: string[];
  conversationPhase: 'initial' | 'followup' | 'troubleshooting';
}

export class AWSConversationMemory {
  private memories: Map<string, ConversationSummaryBufferMemory> = new Map();
  private contexts: Map<string, ConversationContext> = new Map();

  constructor(private llm: ChatBedrockConverse) {}

  // 계정별 메모리 초기화
  async getOrCreateMemory(accountId: string): Promise<ConversationSummaryBufferMemory> {
    if (!this.memories.has(accountId)) {
      const memory = new ConversationSummaryBufferMemory({
        llm: this.llm,
        maxTokenLimit: 500, // 요약된 컨텍스트 최대 토큰 수
        returnMessages: true,
      });
      this.memories.set(accountId, memory);
    }
    return this.memories.get(accountId)!;
  }

  // 컨텍스트 관리
  updateContext(accountId: string, context: Partial<ConversationContext>) {
    const existing = this.contexts.get(accountId) || {
      accountId,
      awsRegion: 'us-east-1',
      lastQueries: [],
      activeResources: [],
      conversationPhase: 'initial'
    };

    this.contexts.set(accountId, { ...existing, ...context });
  }

  getContext(accountId: string): ConversationContext | undefined {
    return this.contexts.get(accountId);
  }

  // 메시지 추가 (자동 요약)
  async addMessage(accountId: string, human: string, ai: string) {
    const memory = await this.getOrCreateMemory(accountId);
    await memory.chatHistory.addMessage(new HumanMessage(human));
    await memory.chatHistory.addMessage(new AIMessage(ai));

    // 컨텍스트 업데이트
    const context = this.getContext(accountId);
    if (context) {
      context.lastQueries = [...context.lastQueries.slice(-2), human]; // 최근 3개만 유지
      this.updateContext(accountId, context);
    }
  }

  // 컨텍스트가 포함된 프롬프트 생성
  async getContextualPrompt(accountId: string, newQuery: string): Promise<string> {
    const memory = await this.getOrCreateMemory(accountId);
    const context = this.getContext(accountId);

    // 메모리에서 압축된 대화 히스토리 가져오기
    const memoryVariables = await memory.loadMemoryVariables({});
    const chatHistory = memoryVariables.history || '';

    // AWS 특화 컨텍스트 구성
    const awsContext = context ? `
AWS 계정: ${context.accountId}
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

  // 메모리 정리 (토큰 절약)
  async clearOldMemory(accountId: string) {
    const memory = await this.getOrCreateMemory(accountId);
    await memory.clear();
  }

  // 관련성 있는 이전 대화만 추출
  async getRelevantHistory(accountId: string, query: string): Promise<BaseMessage[]> {
    const memory = await this.getOrCreateMemory(accountId);
    const messages = await memory.chatHistory.getMessages();

    // 최근 4개 메시지만 반환 (사용자-AI 페어 2개)
    return messages.slice(-4);
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