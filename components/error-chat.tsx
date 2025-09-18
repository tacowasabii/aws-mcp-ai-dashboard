"use client";

import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/stores";
import { Send, Bot, User, RotateCcw } from "lucide-react";

export function ErrorChat() {
  const {
    activeAccountId,
    accounts,
    errorMessages,
    addErrorMessage,
    clearErrorMessages,
    isErrorChatLoading,
    setErrorChatLoading,
  } = useAppStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeAccount = accounts.find((acc) => acc.id === activeAccountId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [errorMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeAccount) return;

    setErrorChatLoading(true);

    addErrorMessage({
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
      accountId: activeAccount.id,
    });

    const currentInput = input;
    setInput("");

    try {
      const response = await fetch("/api/error-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: currentInput,
        }),
      });

      const result = await response.json();

      let messageContent = "";
      if (result.error) {
        messageContent = `❌ **오류 발생**\n\n${result.error}`;
      } else {
        // 객체인 경우 JSON.stringify로 변환하거나 기본 메시지 사용
        if (typeof result.data === 'object' && result.data !== null) {
          messageContent = Object.keys(result.data).length > 0
            ? JSON.stringify(result.data, null, 2)
            : "응답을 받을 수 없습니다";
        } else {
          messageContent = result.data || "응답을 받을 수 없습니다";
        }
      }

      addErrorMessage({
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: messageContent,
        timestamp: new Date(),
        accountId: activeAccount.id,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `❌ **연결 오류**\n\n${error.message}`
          : "❌ **알 수 없는 오류가 발생했습니다**";

      addErrorMessage({
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: errorMessage,
        timestamp: new Date(),
        accountId: activeAccount.id,
      });
    } finally {
      setErrorChatLoading(false);
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
    <>
      <div className="text-xs text-gray-500 border-b pb-2 mb-4">
        <div className="flex justify-between items-center">
          <span>🔧 에러 메시지 처리 시스템</span>
          <div className="flex items-center gap-2">
            <span>{activeAccount.region}</span>
            <button
              onClick={() => clearErrorMessages()}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              title="채팅 기록 초기화"
            >
              <RotateCcw size={14} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto border rounded-lg p-4 bg-gray-50"
        style={{ maxHeight: "calc(100vh - 20rem)", minHeight: "300px" }}
      >
        <div className="space-y-3">
          {errorMessages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-2 ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.type === "ai" && (
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                  <Bot size={12} className="text-orange-600" />
                </div>
              )}

              <div
                className={`max-w-md px-4 py-3 rounded-lg text-sm whitespace-pre-line ${
                  message.type === "user"
                    ? "bg-orange-600 text-white"
                    : "bg-white text-gray-800 shadow-sm border"
                }`}
              >
                {message.content}
              </div>

              {message.type === "user" && (
                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <User size={12} className="text-gray-600" />
                </div>
              )}
            </div>
          ))}

          {isErrorChatLoading && (
            <div className="flex items-start gap-2 justify-start">
              <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                <Bot size={12} className="text-orange-600" />
              </div>

              <div className="max-w-md px-4 py-3 rounded-lg text-sm bg-white text-gray-800 shadow-sm border">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-gray-500">
                    에러 분석 중입니다...
                  </span>
                </div>
              </div>
            </div>
          )}

          {errorMessages.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Bot size={32} className="mx-auto mb-4 text-gray-400" />
              <p className="text-lg mb-2">에러 메시지 처리 시스템</p>
              <p className="text-sm text-gray-400">
                AWS 에러 로그나 문제 상황을 입력하면 분석하고 해결책을
                제안해드립니다.
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3 mt-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="에러 메시지나 문제 상황을 입력하세요..."
          className="flex-1 border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          disabled={isErrorChatLoading}
        />
        <button
          type="submit"
          disabled={isErrorChatLoading || !input.trim()}
          className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isErrorChatLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </form>
    </>
  );
}
