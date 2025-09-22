"use client";

import { useAppStore } from "@/lib/stores";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus, CloudIcon, Settings } from "lucide-react";

export function AccountDropdown() {
  const { accounts, activeAccountId, setActiveAccount } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeAccount = accounts.find((acc) => acc.id === activeAccountId);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAccountSelect = (accountId: string) => {
    setActiveAccount(accountId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 드롭다운 트리거 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        <CloudIcon size={16} className="text-blue-500" />
        <span className="hidden sm:inline">
          {activeAccount ? activeAccount.name : "계정 선택"}
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-2">
            {/* 헤더 */}
            <div className="px-4 py-2 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">AWS 계정</h3>
                <span className="text-xs text-gray-500">
                  {accounts.length}개 계정
                </span>
              </div>
            </div>

            {/* 계정 목록 */}
            <div className="max-h-64 overflow-y-auto">
              {accounts.length > 0 ? (
                accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => handleAccountSelect(account.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                      account.id === activeAccountId ? "bg-blue-50 border-r-2 border-blue-500" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            account.verified ? "bg-green-500" : "bg-yellow-500"
                          }`} />
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {account.name}
                          </p>
                          {account.id === activeAccountId && (
                            <Check size={14} className="text-blue-500 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-xs text-gray-500">
                            {account.region || "리전 미설정"}
                          </p>
                          {account.accountId && (
                            <p className="text-xs text-gray-400 font-mono">
                              {account.accountId}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-6 text-center">
                  <CloudIcon size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 mb-1">등록된 계정이 없습니다</p>
                  <p className="text-xs text-gray-400">
                    AWS 계정을 추가하여 시작하세요
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}