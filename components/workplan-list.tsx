"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/stores";
import {
  RotateCcw,
  FileText,
  Search,
} from "lucide-react";
import { supabase } from "@/utils/supabase";

interface Workplan {
  id: number;
  created_at: string;
  // 추후 다른 필드들도 추가할 수 있습니다
}

export function WorkplanList() {
  const { activeAccountId, accounts } = useAppStore();
  const [workplans, setWorkplans] = useState<Workplan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const activeAccount = accounts.find((acc) => acc.id === activeAccountId);

  useEffect(() => {
    fetchWorkplans();
  }, []);

  const fetchWorkplans = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from("workplan_table").select("*");

      if (error) {
        console.error("Error fetching workplans:", error);
        return;
      }

      setWorkplans(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWorkplans = workplans.filter((workplan) =>
    workplan.id.toString().includes(searchTerm.toLowerCase())
  );

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
              onClick={fetchWorkplans}
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
            placeholder="ID로 검색..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 작업계획서 목록 */}
      <div
        className="flex-1 overflow-y-auto space-y-2 px-4"
        style={{ maxHeight: "calc(100vh - 16rem)", minHeight: "300px" }}
      >
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">작업계획서를 불러오는 중...</p>
          </div>
        ) : filteredWorkplans.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText size={32} className="mx-auto mb-4 text-gray-400" />
            <p className="text-lg mb-2">작업계획서가 없습니다</p>
            <p className="text-sm text-gray-400">새로운 작업계획서를 생성해보세요.</p>
          </div>
        ) : (
          filteredWorkplans.map((workplan) => (
            <div
              key={workplan.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4"
            >
              <div className="flex items-center gap-3">
                <FileText size={16} className="text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900">
                    작업계획서 #{workplan.id}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    생성일: {new Date(workplan.created_at).toLocaleDateString("ko-KR")}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}