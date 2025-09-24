"use client";

import { useState } from "react";
import { AddAccountModal } from "@/components/add-account-modal";
import { AccountDropdown } from "@/components/account-dropdown";
import { ConnectionStatus } from "@/components/connection-status";
import { AWSChat } from "@/components/aws-chat";
import { ErrorChat } from "@/components/error-chat";
import { Terminal } from "@/components/terminal";
import { useAppStore } from "@/lib/stores";

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isErrorHistoryPanelOpen, setErrorHistoryPanelOpen } = useAppStore();

  return (
    <>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* 왼쪽 사이드바 */}
        <aside className="w-80 bg-gradient-to-b from-slate-50 to-slate-100 shadow-xl border-r border-slate-200 flex flex-col flex-shrink-0">
          {/* 로고/제목 */}
          <div className="px-6 py-6 bg-white border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 leading-tight">
                  AWS AI
                </h1>
                <p className="text-sm text-slate-500 font-medium">Assistant</p>
              </div>
            </div>
          </div>

          {/* 연결 상태 */}
          <div className="px-6 py-3">
            <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-emerald-100 rounded-md flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-slate-700">연결 상태</span>
                </div>
                <ConnectionStatus />
              </div>
            </div>
          </div>

          {/* 계정 관리 */}
          <div className="px-6 pb-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-slate-700">계정 관리</span>
              </div>
              <div className="space-y-3">
                <AccountDropdown />
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200 transform hover:scale-[1.01] shadow-sm"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  계정 추가
                </button>
              </div>
            </div>
          </div>

          {/* 네비게이션 메뉴 */}
          <div className="px-6 pb-5">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-slate-700">메뉴</span>
              </div>
              <nav className="space-y-2">
                <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                  </svg>
                  리소스 모니터링
                </a>
                <button
                  onClick={() => setErrorHistoryPanelOpen(!isErrorHistoryPanelOpen)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    isErrorHistoryPanelOpen
                      ? "text-orange-600 bg-orange-50 border border-orange-200"
                      : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.936-.833-2.707 0L4.107 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  에러 히스토리
                </button>
                <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  분석 대시보드
                </a>
                <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  설정
                </a>
              </nav>
            </div>
          </div>

          {/* 사이드바 하단 */}
          <div className="mt-auto px-6 pb-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
              <div className="text-xs font-semibold text-slate-600 mb-1">AI Assistant</div>
              <div className="text-sm text-slate-700 leading-relaxed">
                AWS 전문가가 모든 작업을 도와드립니다
              </div>
            </div>
          </div>
        </aside>

        {/* 메인 컨텐츠 영역 */}
        <main className="flex-1 flex min-w-0 overflow-hidden">
          {/* AWS 리소스 조회 영역 */}
          <div className={`${isErrorHistoryPanelOpen ? "flex-1" : "w-full"} flex flex-col p-6 overflow-hidden`}>
            <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900">AWS AI 어시스턴트</h2>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <AWSChat />
              </div>
            </div>
          </div>

          {/* 에러 히스토리 사이드 패널 */}
          {isErrorHistoryPanelOpen && (
            <div className="w-96 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">에러 히스토리</h2>
                <button
                  onClick={() => setErrorHistoryPanelOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                  title="패널 닫기"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <ErrorChat />
              </div>
            </div>
          )}
        </main>
      </div>

      <AddAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <Terminal />
    </>
  );
}
