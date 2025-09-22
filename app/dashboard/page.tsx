"use client";

import { useState } from "react";
import { AddAccountModal } from "@/components/add-account-modal";
import { AccountDropdown } from "@/components/account-dropdown";
import { ConnectionStatus } from "@/components/connection-status";
import { AWSChat } from "@/components/aws-chat";
import { Terminal } from "@/components/terminal";

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-xl font-semibold text-gray-900">
                AWS AI Dashboard
              </h1>
              <div className="flex items-center gap-4">
                <ConnectionStatus />
                <AccountDropdown />
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
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
        </nav>

        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          style={{ height: "calc(100vh - 4rem)" }}
        >
          <div className="flex flex-col gap-6 h-full">
            {/* 메인: AI 채팅 영역 */}
            <div className="flex-grow bg-white rounded-lg shadow p-6 flex flex-col">
              <h2 className="text-lg font-medium mb-4">AWS 리소스 조회</h2>
              <div className="flex-1 min-h-0">
                <AWSChat />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <Terminal />
    </>
  );
}
