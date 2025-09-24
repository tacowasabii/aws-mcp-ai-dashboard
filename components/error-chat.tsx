"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/stores";
import {
  RotateCcw,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { supabase } from "@/utils/supabase";

interface ErrorSolution {
  id: number;
  original_command: string;
  error_message: string;
  cause: string;
  solution_summary: string;
  steps: string[];
  fixed_command: string;
  documentation_links: string[];
  ai_message: string;
  created_at: string;
}

export function ErrorChat() {
  const { activeAccountId, accounts } = useAppStore();
  const [errorSolutions, setErrorSolutions] = useState<ErrorSolution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const activeAccount = accounts.find((acc) => acc.id === activeAccountId);

  useEffect(() => {
    fetchErrorSolutions();
  }, []);

  const fetchErrorSolutions = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from("error_normal").select("*");

      if (error) {
        console.error("Error fetching data:", error);
        return;
      }

      setErrorSolutions(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSolutions = errorSolutions.filter(
    (solution) =>
      solution.cause?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      solution.solution_summary
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      solution.original_command
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      solution.fixed_command?.toLowerCase().includes(searchTerm.toLowerCase())
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

  if (!activeAccount) {
    return (
      <div className="text-center py-4 text-gray-500">
        <AlertTriangle size={24} className="mx-auto mb-2" />
        <p>AWS 계정을 선택하세요</p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-xs text-gray-500 border-b py-2 mb-4 px-4">
        <div className="flex justify-between items-center">
          <span>📚 에러 해결 라이브러리</span>
          <div className="flex items-center gap-2">
            <span>{filteredSolutions.length}개의 해결책</span>
            <button
              onClick={fetchErrorSolutions}
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
            placeholder="에러 코드, 설명, 명령어로 검색..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* 에러 해결책 목록 */}
      <div
        className="flex-1 overflow-y-auto space-y-4 px-4"
        style={{ maxHeight: "calc(100vh - 16rem)", minHeight: "300px" }}
      >
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">에러 히스토리를 불러오는 중...</p>
          </div>
        ) : filteredSolutions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <AlertTriangle size={32} className="mx-auto mb-4 text-gray-400" />
            <p className="text-lg mb-2">검색 결과가 없습니다</p>
            <p className="text-sm text-gray-400">다른 키워드로 검색해보세요.</p>
          </div>
        ) : (
          filteredSolutions.map((solution, index) => {
            const isExpanded = expandedItems.has(index);
            return (
              <div
                key={index}
                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* 클릭 가능한 헤더 */}
                <div
                  onClick={() => toggleExpanded(index)}
                  className="flex items-center justify-between gap-2 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <AlertTriangle
                      size={16}
                      className="text-red-500 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {solution.id || "에러 코드 없음"}
                      </h3>
                      {solution.solution_summary && (
                        <p className="text-sm text-gray-600 mt-1 break-words line-clamp-2">
                          {solution.solution_summary}
                        </p>
                      )}
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
                      {/* 에러 설명 */}
                      {solution.cause && (
                        <div className="w-full">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            문제 설명
                          </h4>
                          <p className="text-sm text-gray-600 bg-red-50 p-3 rounded border-l-4 border-red-200 break-words">
                            {solution.cause}
                          </p>
                        </div>
                      )}

                      {/* 원본 명령어 */}
                      {solution.original_command && (
                        <div className="w-full">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            문제가 된 명령어
                          </h4>
                          <div className="bg-gray-100 rounded overflow-hidden">
                            <pre className="text-sm p-3 font-mono text-red-600 whitespace-pre-wrap break-all overflow-x-auto max-w-full">
                              {solution.original_command}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* 수정된 명령어 */}
                      {solution.fixed_command && (
                        <div className="w-full">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            수정된 명령어
                          </h4>
                          <div className="bg-green-50 rounded border-l-4 border-green-200 overflow-hidden">
                            <pre className="text-sm p-3 font-mono text-green-700 whitespace-pre-wrap break-all overflow-x-auto max-w-full">
                              {solution.fixed_command}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* 설명 */}
                      {solution.solution_summary && (
                        <div className="w-full">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            해결 방법 설명
                          </h4>
                          <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded break-words">
                            {solution.solution_summary}
                          </p>
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
    </div>
  );
}
