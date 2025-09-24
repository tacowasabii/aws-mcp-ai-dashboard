"use client";

import { useAppStore } from "@/lib/stores";
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  RotateCcw,
  Send,
  User,
  X,
} from "lucide-react";
import { MarkdownModal } from "./markdown-modal";
import { useEffect, useRef, useState } from "react";

export function AWSChat() {
  const {
    activeAccountId,
    accounts,
    messages,
    addMessage,
    clearMessages,
    getConversationId,
    startNewConversation,
  } = useAppStore();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAccountId, setLoadingAccountId] = useState<string | null>(null);
  const [showResourceSelection, setShowResourceSelection] = useState(true);
  const [expandedRefs, setExpandedRefs] = useState<Set<string>>(new Set());
  const [copiedMessages, setCopiedMessages] = useState<Set<string>>(new Set());
  const [showMarkdownModal, setShowMarkdownModal] = useState(false);
  const [markdownContent, setMarkdownContent] = useState("");
  // 규칙(컨벤션) 모달 상태
  const [showConventionModal, setShowConventionModal] = useState(false);
  const [conventionText, setConventionText] = useState("");
  const [isConventionLoading, setIsConventionLoading] = useState(false);
  const [isConventionSaving, setIsConventionSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeAccount = accounts.find((acc) => acc.id === activeAccountId);
  const accountMessages = activeAccountId
    ? messages.get(activeAccountId) || []
    : [];

  // 메시지 개수를 추적하여 실제로 메시지가 추가될 때만 스크롤
  const [prevMessageCount, setPrevMessageCount] = useState(0);

  // 계정이 변경되면 리소스 선택 화면을 다시 보여주고 새 대화 세션 시작
  useEffect(() => {
    if (activeAccountId) {
      const hasMessages = accountMessages.length > 0;
      setShowResourceSelection(!hasMessages);

      // 대화 세션이 없으면 새로 생성
      if (!getConversationId(activeAccountId)) {
        startNewConversation(activeAccountId);
      }
    }
  }, [
    activeAccountId,
    accountMessages.length,
    getConversationId,
    startNewConversation,
  ]);

  useEffect(() => {
    if (accountMessages.length > prevMessageCount) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    setPrevMessageCount(accountMessages.length);
  }, [accountMessages.length, prevMessageCount]);

  const toggleRefsExpansion = (messageId: string) => {
    setExpandedRefs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const copyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessages((prev) => new Set(prev).add(messageId));

      // 3초 후 복사 상태 초기화
      setTimeout(() => {
        setCopiedMessages((prev) => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
      }, 500);
    } catch (error) {
      console.error("복사 실패:", error);
    }
  };

  const openMarkdownModal = (content: string) => {
    setMarkdownContent(content);
    setShowMarkdownModal(true);
  };

  const closeMarkdownModal = () => {
    setShowMarkdownModal(false);
    setMarkdownContent("");
  };

  // 규칙(컨벤션) 모달 열기: GET으로 기본값 불러오기
  const openConventionModal = async () => {
    setShowConventionModal(true);
    setIsConventionLoading(true);
    try {
      const resp = await fetch("/api/convention", { method: "GET" });
      const data = await resp.json();

      // 다양한 응답 형태 대응
      let defaultText = "";
      if (typeof data === "string") {
        defaultText = data;
      } else if (typeof data?.output === "string") {
        defaultText = data.output;
      } else if (typeof data?.output?.convention === "string") {
        defaultText = data.output.convention;
      } else if (typeof data?.convention === "string") {
        defaultText = data.convention;
      } else {
        defaultText = JSON.stringify(data, null, 2);
      }
      setConventionText(defaultText);
    } catch (e) {
      setConventionText("");
      console.warn("컨벤션 GET 실패", e);
    } finally {
      setIsConventionLoading(false);
    }
  };

  // 규칙(컨벤션) 저장 POST
  const postConvention = async () => {
    try {
      await fetch("/api/convention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ convention: conventionText }),
      });
    } catch (e) {
      console.warn("컨벤션 POST 실패", e);
    }
  };

  // 닫기 동작도 저장과 동일하게 POST 후 닫기
  const handleCloseConventionModal = async () => {
    setIsConventionSaving(true);
    try {
      await postConvention();
    } finally {
      setIsConventionSaving(false);
      setShowConventionModal(false);
    }
  };

  const handleResourceSelection = async (resourceType: string) => {
    if (!activeAccount) return;
    setShowResourceSelection(false);
    setIsLoading(true);
    setLoadingAccountId(activeAccount.id);

    // 리소스 타입에 따른 기본 쿼리 설정
    const resourceQueries = {
      ec2: "EC2 인스턴스 목록을 조회해주세요",
      eks: "EKS 클러스터 목록을 조회해주세요",
      vpc: "VPC 목록을 조회해주세요",
    };

    const query =
      resourceQueries[resourceType as keyof typeof resourceQueries] ||
      `${resourceType} 리소스 목록을 조회해주세요`;

    // AI 초기 메시지 추가
    addMessage({
      id: Date.now().toString(),
      type: "ai",
      content: `안녕하세요! ${resourceType.toUpperCase()} 리소스를 조회하겠습니다. 잠시만 기다려주세요...`,
      timestamp: new Date(),
    });

    try {
      // 현재 대화 세션 ID 가져오기
      const conversationId = getConversationId(activeAccount.id);

      // AWS SDK를 통한 리소스 조회
      const response = await fetch("/api/aws-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query,
          sessionId: conversationId || activeAccount.id,
          credentials: {
            accessKeyId: activeAccount.accessKeyId,
            secretAccessKey: activeAccount.secretAccessKey,
            region: activeAccount.region,
          },
        }),
      });

      const result = await response.json();

      // 응답 내용 처리 (성공/에러 모두 처리)
      let messageContent = "";
      if (result.error) {
        // 에러가 있는 경우
        const errorData =
          typeof result.data === "string"
            ? result.data
            : JSON.stringify(result.data, null, 2);
        const errorMsg =
          typeof result.error === "string"
            ? result.error
            : JSON.stringify(result.error, null, 2);
        messageContent = `❌ **오류 발생**\n\n${errorData || errorMsg}`;
      } else {
        // 정상 응답인 경우 - 객체인 경우 문자열로 변환
        if (typeof result.data === "string") {
          messageContent =
            result.data || "요청이 성공했으나 응답이 비어있습니다.";
        } else if (typeof result.data === "object" && result.data !== null) {
          messageContent = JSON.stringify(result.data, null, 2);
        } else {
          messageContent =
            result.data || "요청이 성공했으나 응답이 비어있습니다.";
        }
      }

      addMessage({
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: messageContent,
        timestamp: new Date(),
        refs: result.refs || undefined,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `❌ **연결 오류**\n\n${error.message}`
          : "❌ **알 수 없는 오류가 발생했습니다**";

      addMessage({
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: errorMessage,
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
      setLoadingAccountId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeAccount) return;

    setIsLoading(true);
    setLoadingAccountId(activeAccount.id);

    // 사용자 메시지 추가
    addMessage({
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
    });

    // 입력 필드 즉시 초기화
    const currentInput = input;
    setInput("");

    try {
      // 현재 대화 세션 ID 가져오기
      const conversationId = getConversationId(activeAccount.id);

      // 통합 AWS 워크플로우를 통한 자연어 쿼리 처리
      const response = await fetch("/api/aws-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: currentInput,
          sessionId: conversationId || activeAccount.id,
          credentials: {
            accessKeyId: activeAccount.accessKeyId,
            secretAccessKey: activeAccount.secretAccessKey,
            region: activeAccount.region,
          },
        }),
      });

      const result = await response.json();

      // 응답 내용 처리 (성공/에러 모두 처리)
      let messageContent = "";
      if (result.error) {
        // 에러가 있는 경우
        const errorData =
          typeof result.data === "string"
            ? result.data
            : JSON.stringify(result.data, null, 2);
        const errorMsg =
          typeof result.error === "string"
            ? result.error
            : JSON.stringify(result.error, null, 2);
        messageContent = `❌ **오류 발생**\n\n${errorData || errorMsg}`;
      } else {
        // 정상 응답인 경우 - 객체인 경우 문자열로 변환
        if (typeof result.data === "string") {
          messageContent =
            result.data || "요청이 성공했으나 응답이 비어있습니다.";
        } else if (typeof result.data === "object" && result.data !== null) {
          messageContent = JSON.stringify(result.data, null, 2);
        } else {
          messageContent =
            result.data || "요청이 성공했으나 응답이 비어있습니다.";
        }
      }

      addMessage({
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: messageContent,
        timestamp: new Date(),
        refs: result.refs || undefined, // refs 데이터 추가
      });
    } catch (error) {
      // 네트워크 오류나 기타 예외 처리
      const errorMessage =
        error instanceof Error
          ? `❌ **연결 오류**\n\n${error.message}`
          : "❌ **알 수 없는 오류가 발생했습니다**";

      addMessage({
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: errorMessage,
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
      setLoadingAccountId(null);
    }
  };

  if (!activeAccount) {
    return (
      <div className="text-center py-4 text-gray-500">
        <Bot size={24} className="mx-auto mb-2" />
        <p>AWS 계정을 선택하세요</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 상태 표시 */}
      <div className="text-xs text-gray-500 border-b py-2 mb-4 px-4">
        <div className="flex justify-between items-center">
          <span>🤖 Bedrock LLM + AWS SDK + n8n</span>
          <div className="flex items-center gap-2">
            <span>{activeAccount.region}</span>
            <button
              onClick={() => clearMessages()}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              title="채팅 기록 초기화"
            >
              <RotateCcw size={14} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* 채팅 메시지 영역 */}
      <div
        className="flex-1 overflow-y-auto border rounded-lg p-4 bg-gray-50 mx-4"
        style={{ maxHeight: "calc(100vh - 15rem)", minHeight: "300px" }}
      >
        <div className="space-y-3">
          {accountMessages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-2 ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.type === "ai" && (
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <Bot size={12} className="text-blue-600" />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <div className="relative group">
                  <div
                    data-color-mode="light"
                    className={`max-w-md px-4 py-3 rounded-lg text-sm whitespace-pre-line break-words ${
                      message.type === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-800 shadow-sm border"
                    }`}
                  >
                    {message.content}
                  </div>

                  {/* 복사 버튼과 마크다운 보기 버튼 - AI 메시지에만 표시 */}
                  {message.type === "ai" && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => openMarkdownModal(message.content)}
                        className="p-1 rounded transition-all text-xs duration-200 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800"
                        title="마크다운으로 보기"
                      >
                        Markdown
                      </button>
                      <button
                        onClick={() => copyMessage(message.id, message.content)}
                        className={`p-1 rounded transition-all duration-200 ${
                          copiedMessages.has(message.id)
                            ? "bg-green-100 text-green-600"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800"
                        }`}
                        title={
                          copiedMessages.has(message.id)
                            ? "복사됨!"
                            : "메시지 복사"
                        }
                      >
                        {copiedMessages.has(message.id) ? (
                          <Check size={14} />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* refs가 있는 경우 참조 링크 박스 표시 (AI 메시지에만) */}
                {message.type === "ai" &&
                  message.refs &&
                  message.refs.length > 0 && (
                    <div className="max-w-md">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs text-gray-500">📖 레퍼런스</div>
                        {message.refs.length > 2 && (
                          <button
                            onClick={() => toggleRefsExpansion(message.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            {expandedRefs.has(message.id) ? (
                              <>
                                접기 <ChevronUp size={12} />
                              </>
                            ) : (
                              <>
                                펼쳐보기 <ChevronDown size={12} />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(expandedRefs.has(message.id)
                          ? message.refs
                          : message.refs.slice(0, 2)
                        ).map((ref, index) => (
                          <a
                            key={index}
                            href={ref.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-xs text-blue-700 hover:text-blue-800 transition-colors duration-200"
                            title={ref.link}
                          >
                            {ref.title}
                          </a>
                        ))}
                        {!expandedRefs.has(message.id) &&
                          message.refs.length > 2 && (
                            <span className="inline-block px-2 py-1 text-xs text-gray-500">
                              +{message.refs.length - 2}개 더
                            </span>
                          )}
                      </div>
                    </div>
                  )}
              </div>

              {message.type === "user" && (
                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <User size={12} className="text-gray-600" />
                </div>
              )}
            </div>
          ))}

          {/* AI 응답 로딩 상태 - 현재 활성 계정에서만 표시 */}
          {isLoading && loadingAccountId === activeAccountId && (
            <div className="flex items-start gap-2 justify-start">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <Bot size={12} className="text-blue-600" />
              </div>

              <div className="max-w-md px-4 py-3 rounded-lg text-sm bg-white text-gray-800 shadow-sm border">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-gray-500">
                    AI가 답변을 생성중입니다...
                  </span>
                </div>
              </div>
            </div>
          )}

          {accountMessages.length === 0 && !showResourceSelection && (
            <div className="text-center py-12 text-gray-500">
              <Bot size={32} className="mx-auto mb-4 text-gray-400" />
              <p className="text-lg mb-2">AWS 전문 어시스턴트</p>
              <p className="text-sm text-gray-400">
                Bedrock LLM이 AWS 전문가로서 답변합니다. EC2/EKS/VPC는 실시간
                데이터로, 다른 질문은 전문 지식으로 답변해드립니다.
              </p>
            </div>
          )}

          {/* 리소스 선택 화면 */}
          {showResourceSelection && (
            <div className="text-center py-12">
              <Bot size={48} className="mx-auto mb-6 text-blue-500" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                어떤 AWS 리소스를 조회하시겠습니까?
              </h3>
              <p className="text-sm text-gray-500 mb-8">
                원하는 리소스를 선택하면 자동으로 목록을 조회해드립니다.
              </p>

              <div className="flex flex-col gap-3 max-w-sm mx-auto">
                <button
                  onClick={() => handleResourceSelection("ec2")}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-3 p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-orange-600 font-bold text-sm">
                      EC2
                    </span>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">
                      EC2 인스턴스
                    </div>
                    <div className="text-sm text-gray-500">
                      가상 서버 인스턴스 조회
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleResourceSelection("eks")}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-3 p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-sm">
                      EKS
                    </span>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">
                      EKS 클러스터
                    </div>
                    <div className="text-sm text-gray-500">
                      Kubernetes 클러스터 조회
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleResourceSelection("vpc")}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-3 p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-bold text-sm">
                      VPC
                    </span>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">
                      VPC 네트워크
                    </div>
                    <div className="text-sm text-gray-500">
                      가상 프라이빗 클라우드 조회
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* 스크롤 참조 */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 입력 영역 */}
      <form onSubmit={handleSubmit} className="flex gap-3 mt-4 px-4">
        <button
          type="button"
          onClick={openConventionModal}
          className="px-4 py-3 border rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed gap-1"
          disabled={isLoading}
          title="규칙(컨벤션) 관리"
        >
          규칙
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="AWS에 대해 무엇이든 질문하세요..."
          className="flex-1 border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </form>

      {/* 마크다운 모달 */}
      <MarkdownModal
        isOpen={showMarkdownModal}
        onClose={closeMarkdownModal}
        title="AWS Chat - 마크다운 미리보기"
        content={markdownContent}
      />

      {/* 규칙(컨벤션) 모달 */}
      {showConventionModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseConventionModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">규칙 설정</h3>
              <button
                onClick={handleCloseConventionModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="저장 후 닫기"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* 본문 */}
            <div className="p-4 px-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {isConventionLoading ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span>규칙을 불러오는 중...</span>
                </div>
              ) : (
                <>
                  <label className="block text-sm text-gray-600 mb-2">
                    규칙 텍스트
                  </label>
                  <textarea
                    value={conventionText}
                    onChange={(e) => setConventionText(e.target.value)}
                    className="w-full border rounded-lg p-3 text-sm min-h-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="예) Policy Name=policy-CSR_{CSR_no}, Catoz=CSR{CSR_no} 태그를 반드시 추가한다."
                    disabled={isConventionSaving}
                  />
                  <p className="mt-2 text-xs text-gray-400">
                    저장 또는 닫기 시 규칙이 업데이트됩니다.
                  </p>
                </>
              )}
            </div>

            {/* 푸터 */}
            <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
              <button
                onClick={handleCloseConventionModal}
                disabled={isConventionLoading || isConventionSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isConventionSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : null}
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
