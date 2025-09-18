"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/stores";
import { AddAccountModal } from "@/components/add-account-modal";
import { AccountList } from "@/components/account-list";
import { ConnectionStatus } from "@/components/connection-status";
import { AWSChat } from "@/components/aws-chat";
import { Plus } from "lucide-react";

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { accounts, activeAccountId } = useAppStore();

  const activeAccount = accounts.find((acc) => acc.id === activeAccountId);

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-xl font-semibold">AWS Dashboard</h1>
              <div className="flex items-center gap-4">
                <ConnectionStatus />
                {activeAccount && (
                  <div className="text-sm">
                    <span className="text-gray-500">활성 계정:</span>
                    <span className="ml-2 font-medium">
                      {activeAccount.name}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
                >
                  <Plus size={16} />
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
          <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* 사이드바: 계정 관리 & 연결 상태 */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-base font-medium mb-3">AWS 계정</h2>
                <AccountList />
              </div>

            </div>

            {/* 메인: AI 채팅 영역 */}
            <div className="lg:col-span-3 flex-grow bg-white rounded-lg shadow p-6 flex flex-col">
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
    </>
  );
}
