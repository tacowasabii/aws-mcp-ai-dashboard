"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/stores";
import {
  RotateCcw,
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useWorkplans } from "@/hooks/useSupabaseData";
import { MarkdownModal } from "./markdown-modal";

interface Workplan {
  id: number;
  sessionId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export function WorkplanList() {
  const { activeAccountId, accounts } = useAppStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [showMarkdownModal, setShowMarkdownModal] = useState(false);
  const [markdownContent, setMarkdownContent] = useState("");
  const [markdownTitle, setMarkdownTitle] = useState("");

  // SWR로 데이터 페칭, 캐싱 및 자동 새로고침
  const { workplans, isLoading, error, mutate } = useWorkplans();

  const activeAccount = accounts.find((acc) => acc.id === activeAccountId);

  const filteredWorkplans = workplans.filter(
    (workplan) =>
      workplan.id.toString().includes(searchTerm.toLowerCase()) ||
      workplan.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workplan.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpanded = (index: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const openMarkdownModal = (title: string, content: string) => {
    setMarkdownTitle(title);
    setMarkdownContent(content);
    setShowMarkdownModal(true);
  };

  const closeMarkdownModal = () => {
    setShowMarkdownModal(false);
    setMarkdownContent("");
    setMarkdownTitle("");
  };

  if (!activeAccount) {
    return (
      <div className="text-center py-4 text-gray-500">
        <FileText size={24} className="mx-auto mb-2" />
        <p>AWS 계정을 선택하세요</p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-xs text-gray-500 border-b py-2 mb-4 px-4">
        <div className="flex justify-between items-center">
          <span>📋 작업계획서 목록</span>
          <div className="flex items-center gap-2">
            <span>{filteredWorkplans.length}개의 계획서</span>
            <button
              onClick={() => mutate()}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              title="새로고침"
            >
              <RotateCcw size={14} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* 검색 박스 */}
      <div className="mb-4 px-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ID, 제목, 내용으로 검색..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 작업계획서 목록 */}
      <div
        className="flex-1 overflow-y-auto space-y-2 px-4"
        style={{ maxHeight: "calc(100vh - 12rem)", minHeight: "300px" }}
      >
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">작업계획서를 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">
            <FileText size={32} className="mx-auto mb-4 text-red-400" />
            <p className="text-lg mb-2">데이터 로드 실패</p>
            <p className="text-sm text-red-400 mb-4">{error.message}</p>
            <button
              onClick={() => mutate()}
              className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : filteredWorkplans.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText size={32} className="mx-auto mb-4 text-gray-400" />
            <p className="text-lg mb-2">작업계획서가 없습니다</p>
            <p className="text-sm text-gray-400">
              새로운 작업계획서를 생성해보세요.
            </p>
          </div>
        ) : (
          filteredWorkplans.map((workplan: Workplan, index) => {
            const isExpanded = expandedItems.has(index);
            return (
              <div
                key={workplan.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* 클릭 가능한 헤더 */}
                <div
                  onClick={() => toggleExpanded(index)}
                  className="flex items-center justify-between gap-2 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText
                      size={16}
                      className="text-blue-500 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {workplan.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(workplan.createdAt).toLocaleDateString(
                          "ko-KR",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {/* 펼쳐지는 상세 내용 */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="pt-4 space-y-4">
                      {/* 제목 */}
                      <div className="w-full">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          제목
                        </h4>
                        <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded break-words">
                          {workplan.title}
                        </div>
                      </div>

                      {/* 작업계획서 내용 */}
                      {workplan.content && (
                        <div className="w-full">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-gray-700">
                              작업계획서 내용
                            </h4>
                            <button
                              onClick={() =>
                                openMarkdownModal(
                                  workplan.title,
                                  workplan.content
                                )
                              }
                              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                              title="마크다운으로 보기"
                            >
                              Markdown
                            </button>
                          </div>
                          <div className="bg-blue-50 p-3 rounded">
                            <div className="text-sm text-gray-600 whitespace-pre-wrap break-words">
                              {workplan.content}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 마크다운 모달 */}
      <MarkdownModal
        isOpen={showMarkdownModal}
        onClose={closeMarkdownModal}
        title={markdownTitle}
        content={markdownContent}
      />
    </div>
  );
}
