"use client";

import { useAppStore } from "@/lib/stores";
import MDEditor from "@uiw/react-md-editor";
import {
  AlertTriangle,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  MessageSquare,
  RotateCcw,
  Send,
  User,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ErrorChat } from "./error-chat";

export function AWSChat() {
  const {
    activeAccountId,
    accounts,
    messages,
    activeChatTab,
    addMessage,
    clearMessages,
    setActiveChatTab,
  } = useAppStore();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAccountId, setLoadingAccountId] = useState<string | null>(null);
  const [expandedRefs, setExpandedRefs] = useState<Set<string>>(new Set());
  const [copiedMessages, setCopiedMessages] = useState<Set<string>>(new Set());
  const [showMarkdownModal, setShowMarkdownModal] = useState(false);
  const [markdownContent, setMarkdownContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeAccount = accounts.find((acc) => acc.id === activeAccountId);
  const accountMessages = messages.filter(
    (msg) => msg.accountId === activeAccountId
  );

  // 메시지 개수를 추적하여 실제로 메시지가 추가될 때만 스크롤
  const [prevMessageCount, setPrevMessageCount] = useState(0);

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

  const exportAsHTML = () => {
    // HTML 템플릿 생성
    const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AWS Chat - Markdown Export</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #1f2937;
            background-color: #ffffff;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #111827;
            margin-top: 24px;
            margin-bottom: 16px;
        }
        h1 { font-size: 2em; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
        h2 { font-size: 1.5em; }
        h3 { font-size: 1.17em; }
        code {
            background-color: #f3f4f6;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', monospace;
            font-size: 0.9em;
        }
        pre {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            overflow-x: auto;
            margin: 16px 0;
            position: relative;
        }
        pre code {
            background-color: transparent;
            padding: 0;
            font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 0.875em;
            line-height: 1.5;
            color: #334155;
        }
        pre[class*="language-"] {
            background-color: #1e293b;
            border-color: #334155;
        }
        pre[class*="language-"] code {
            color: #e2e8f0;
        }
        .language-bash::before,
        .language-sh::before,
        .language-shell::before {
            content: "Bash";
            position: absolute;
            top: 8px;
            right: 12px;
            background: #059669;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
        }
        .language-javascript::before,
        .language-js::before {
            content: "JavaScript";
            position: absolute;
            top: 8px;
            right: 12px;
            background: #f59e0b;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
        }
        .language-python::before,
        .language-py::before {
            content: "Python";
            position: absolute;
            top: 8px;
            right: 12px;
            background: #3b82f6;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
        }
        .language-json::before {
            content: "JSON";
            position: absolute;
            top: 8px;
            right: 12px;
            background: #8b5cf6;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
        }
        blockquote {
            border-left: 4px solid #e5e7eb;
            margin: 0;
            padding-left: 16px;
            color: #6b7280;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
        }
        th, td {
            border: 1px solid #e5e7eb;
            padding: 8px 12px;
            text-align: left;
        }
        th {
            background-color: #f9fafb;
            font-weight: 600;
        }
        a {
            color: #2563eb;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .export-header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
        }
        .export-footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="export-header">
        <h1>AWS Chat - AI 응답</h1>
        <p>생성일: ${new Date().toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}</p>
    </div>

    <div class="markdown-content">
${(() => {
  const lines = markdownContent.split("\n");
  let inCodeBlock = false;
  let codeLanguage = "";

  return lines
    .map((line, index) => {
      let html = line;

      // 코드 블록 처리
      if (line.startsWith("```")) {
        if (!inCodeBlock) {
          // 코드 블록 시작
          inCodeBlock = true;
          codeLanguage = line.substring(3).trim();
          return `<pre><code class="language-${codeLanguage || "text"}">`;
        } else {
          // 코드 블록 끝
          inCodeBlock = false;
          return "</code></pre>";
        }
      }

      // 코드 블록 내부인 경우 HTML 이스케이프
      if (inCodeBlock) {
        return html
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#x27;");
      }

      // 헤더 변환
      html = html.replace(/^### (.+)$/, "<h3>$1</h3>");
      html = html.replace(/^## (.+)$/, "<h2>$1</h2>");
      html = html.replace(/^# (.+)$/, "<h1>$1</h1>");

      // 볼드 텍스트
      html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

      // 이탤릭 텍스트 (볼드가 처리된 후)
      html = html.replace(/\*([^*]+?)\*/g, "<em>$1</em>");

      // 인라인 코드
      html = html.replace(/`([^`]+?)`/g, "<code>$1</code>");

      // 링크 (새창에서 열리도록)
      html = html.replace(
        /\[(.+?)\]\((.+?)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
      );

      // 리스트 아이템
      html = html.replace(/^- (.+)$/, "<li>$1</li>");
      html = html.replace(/^\* (.+)$/, "<li>$1</li>");
      html = html.replace(/^\d+\. (.+)$/, "<li>$1</li>");

      // 빈 줄
      if (html.trim() === "") {
        return "<br>";
      }

      // 일반 텍스트는 p 태그로 감싸기 (헤더나 리스트가 아닌 경우)
      if (
        !html.startsWith("<h") &&
        !html.startsWith("<pre") &&
        !html.startsWith("<br") &&
        !html.startsWith("<li") &&
        html.trim() !== ""
      ) {
        html = `<p>${html}</p>`;
      }

      return html;
    })
    .join("\n");
})()}
    </div>

    <div class="export-footer">
        <p>AWS MCP AI Dashboard에서 생성됨</p>
    </div>
</body>
</html>`;

    // 파일 다운로드
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aws-chat-export-${new Date().getTime()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      accountId: activeAccount.id,
    });

    // 입력 필드 즉시 초기화
    const currentInput = input;
    setInput("");

    try {
      // 통합 AWS 워크플로우를 통한 자연어 쿼리 처리
      const response = await fetch("/api/aws-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: currentInput,
          accountId: activeAccount.id,
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
        accountId: activeAccount.id,
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
        accountId: activeAccount.id,
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
      {/* 탭 네비게이션 */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => setActiveChatTab("workflow")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeChatTab === "workflow"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <MessageSquare size={16} />
          작업계획서 채팅
          {messages.length > 0 && (
            <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
              {messages.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveChatTab("error")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeChatTab === "error"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <AlertTriangle size={16} />
          에러 히스토리
        </button>
      </div>

      {activeChatTab === "error" ? (
        <ErrorChat />
      ) : (
        <>
          {/* 상태 표시 */}
          <div className="text-xs text-gray-500 border-b pb-2 mb-4">
            <div className="flex justify-between items-center">
              <span>🤖 Bedrock LLM + AWS SDK</span>
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
            className="flex-1 overflow-y-auto border rounded-lg p-4 bg-gray-50"
            style={{ maxHeight: "calc(100vh - 20rem)", minHeight: "300px" }}
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
                            onClick={() =>
                              copyMessage(message.id, message.content)
                            }
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
                            <div className="text-xs text-gray-500">
                              📖 레퍼런스
                            </div>
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

              {accountMessages.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Bot size={32} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-lg mb-2">AWS 전문 어시스턴트</p>
                  <p className="text-sm text-gray-400">
                    Bedrock LLM이 AWS 전문가로서 답변합니다. EC2/EKS/VPC는
                    실시간 데이터로, 다른 질문은 전문 지식으로 답변해드립니다.
                  </p>
                </div>
              )}

              {/* 스크롤 참조 */}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* 입력 영역 */}
          <form onSubmit={handleSubmit} className="flex gap-3 mt-4">
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
        </>
      )}

      {/* 마크다운 뷰어 모달 */}
      {showMarkdownModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closeMarkdownModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                마크다운 미리보기
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportAsHTML}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  title="HTML로 다운로드"
                >
                  <Download size={16} />
                  Export
                </button>
                <button
                  onClick={closeMarkdownModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* 모달 내용 */}
            <div
              className="p-4 px-7 overflow-y-auto max-h-[calc(90vh-120px)]"
              onClick={(e) => {
                // 마크다운 내의 모든 링크를 새창에서 열도록 설정
                const target = e.target as HTMLElement;
                if (target.tagName === "A") {
                  e.preventDefault();
                  const href = target.getAttribute("href");
                  if (href) {
                    window.open(href, "_blank", "noopener,noreferrer");
                  }
                }
              }}
            >
              <div data-color-mode="light">
                <MDEditor.Markdown
                  source={markdownContent}
                  style={{
                    backgroundColor: "transparent",
                    color: "#1f2937",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
