"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/stores";
import { RotateCcw, AlertTriangle, CheckCircle, Search } from "lucide-react";
import { supabase } from "@/utils/supabase";

interface ErrorSolution {
  error_code: string;
  error_description: string;
  original_command: string;
  fixed_command: string;
  explanation: string;
  related_documentation: string;
}

export function ErrorChat() {
  const { activeAccountId, accounts } = useAppStore();
  const [errorSolutions, setErrorSolutions] = useState<ErrorSolution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const activeAccount = accounts.find((acc) => acc.id === activeAccountId);

  useEffect(() => {
    fetchErrorSolutions();
  }, []);

  const fetchErrorSolutions = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from("prompthon").select("*");

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
      solution.error_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      solution.error_description
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      solution.original_command
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      solution.fixed_command?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!activeAccount) {
    return (
      <div className="text-center py-4 text-gray-500">
        <AlertTriangle size={24} className="mx-auto mb-2" />
        <p>AWS 계정을 선택하세요</p>
      </div>
    );
  }

  return (
    <>
      <div className="text-xs text-gray-500 border-b pb-2 mb-4">
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
      <div className="mb-4">
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
        className="flex-1 overflow-y-auto space-y-4"
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
          filteredSolutions.map((solution, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* 에러 코드 및 상태 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-500" />
                  <h3 className="font-medium text-gray-900">
                    {solution.error_code || "에러 코드 없음"}
                  </h3>
                </div>
                <div title="해결됨">
                  <CheckCircle size={16} className="text-green-500" />
                </div>
              </div>

              {/* 에러 설명 */}
              {solution.error_description && (
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">
                    문제 설명
                  </h4>
                  <p className="text-sm text-gray-600 bg-red-50 p-2 rounded border-l-4 border-red-200">
                    {solution.error_description}
                  </p>
                </div>
              )}

              {/* 원본 명령어 */}
              {solution.original_command && (
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">
                    문제가 된 명령어
                  </h4>
                  <pre className="text-sm bg-gray-100 p-2 rounded font-mono text-red-600 whitespace-pre-wrap">
                    {solution.original_command}
                  </pre>
                </div>
              )}

              {/* 수정된 명령어 */}
              {solution.fixed_command && (
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">
                    수정된 명령어
                  </h4>
                  <pre className="text-sm bg-green-50 p-2 rounded font-mono text-green-700 whitespace-pre-wrap border-l-4 border-green-200">
                    {solution.fixed_command}
                  </pre>
                </div>
              )}

              {/* 설명 */}
              {solution.explanation && (
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">
                    해결 방법 설명
                  </h4>
                  <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                    {solution.explanation}
                  </p>
                </div>
              )}

              {/* 관련 문서 */}
              {/* {solution.related_documentation && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">관련 문서</h4>
                  <a
                    href={solution.related_documentation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <ExternalLink size={12} />
                    참조 문서 보기
                  </a>
                </div>
              )} */}
            </div>
          ))
        )}
      </div>
    </>
  );
}
