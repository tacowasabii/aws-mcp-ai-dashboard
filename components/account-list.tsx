"use client";

import { useAppStore } from "@/lib/stores";
import { CheckCircle, AlertCircle, Trash2 } from "lucide-react";

export function AccountList() {
  const { accounts, activeAccountId, setActiveAccount, removeAccount } =
    useAppStore();

  const handleDelete = (e: React.MouseEvent, accountId: string) => {
    e.stopPropagation();
    if (confirm("정말 이 계정을 삭제하시겠습니까?")) {
      removeAccount(accountId);
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>등록된 AWS 계정이 없습니다</p>
        <p className="text-sm">
          우측 상단의 "계정 추가" 버튼을 눌러 시작하세요
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {accounts.map((account) => (
        <div
          key={account.id}
          className={`p-4 pr-3 border rounded-lg transition-colors ${
            activeAccountId === account.id
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div
              onClick={() => setActiveAccount(account.id)}
              className="flex-1 cursor-pointer"
            >
              <h3 className="font-medium">{account.name}</h3>
              <p className="text-sm text-gray-500">{account.region}</p>
            </div>
            <div className="flex items-center gap-2">
              {account.isActive ? (
                <CheckCircle size={16} className="text-green-500" />
              ) : (
                <AlertCircle size={16} className="text-gray-400" />
              )}
              {/* {activeAccountId === account.id && (
                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                  활성
                </span>
              )} */}
              <button
                onClick={(e) => handleDelete(e, account.id)}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="계정 삭제"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
