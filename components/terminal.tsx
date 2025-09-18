"use client";

import { useState, useRef, useEffect } from "react";
import {
  Terminal as TerminalIcon,
  Minimize2,
  Maximize2,
  X,
} from "lucide-react";
import { useAppStore } from "@/lib/stores";

interface TerminalEntry {
  type: "command" | "output" | "error";
  content: string;
  timestamp: Date;
}

export function Terminal() {
  const {
    isTerminalOpen,
    isTerminalMinimized,
    setTerminalOpen,
    setTerminalMinimized,
    terminalHeight,
    setTerminalHeight,
  } = useAppStore();
  const [currentCommand, setCurrentCommand] = useState("");
  const [entries, setEntries] = useState<TerminalEntry[]>([
    {
      type: "output",
      content:
        'AWS MCP Dashboard Terminal v1.0.0\nType "help" for available commands.',
      timestamp: new Date(),
    },
  ]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartHeight, setDragStartHeight] = useState(0);

  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [entries]);

  useEffect(() => {
    if (isTerminalOpen && !isTerminalMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isTerminalOpen, isTerminalMinimized]);

  // 터미널이 열려있을 때 body에 padding-bottom 추가
  useEffect(() => {
    const body = document.body;
    if (isTerminalOpen && !isTerminalMinimized) {
      body.style.paddingBottom = `${terminalHeight}px`;
    } else if (isTerminalOpen && isTerminalMinimized) {
      body.style.paddingBottom = "40px"; // 최소화된 터미널 높이만큼
    } else {
      body.style.paddingBottom = "0";
    }

    // cleanup
    return () => {
      body.style.paddingBottom = "0";
    };
  }, [isTerminalOpen, isTerminalMinimized, terminalHeight]);

  // 드래그 이벤트 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStartY(e.clientY);
    setDragStartHeight(terminalHeight);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaY = dragStartY - e.clientY; // 위로 드래그하면 양수
      const newHeight = dragStartHeight + deltaY;
      setTerminalHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, dragStartY, dragStartHeight, setTerminalHeight]);

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    // 명령어 기록에 추가
    setCommandHistory((prev) => [...prev, command]);
    setHistoryIndex(-1);

    // 명령어 표시
    setEntries((prev) => [
      ...prev,
      {
        type: "command",
        content: `$ ${command}`,
        timestamp: new Date(),
      },
    ]);

    setIsLoading(true);

    try {
      // 내장 명령어 처리
      if (command === "help") {
        setEntries((prev) => [
          ...prev,
          {
            type: "output",
            content: `Available commands:
- help: Show this help message
- clear: Clear terminal output
- aws: Execute AWS CLI commands (e.g., "aws s3 ls")
- date: Show current date and time
- pwd: Show current working directory
- whoami: Show current user`,
            timestamp: new Date(),
          },
        ]);
        setIsLoading(false);
        return;
      }

      if (command === "clear") {
        setEntries([
          {
            type: "output",
            content:
              'AWS MCP Dashboard Terminal v1.0.0\nType "help" for available commands.',
            timestamp: new Date(),
          },
        ]);
        setIsLoading(false);
        return;
      }

      if (command === "date") {
        setEntries((prev) => [
          ...prev,
          {
            type: "output",
            content: new Date().toString(),
            timestamp: new Date(),
          },
        ]);
        setIsLoading(false);
        return;
      }

      if (command === "pwd") {
        setEntries((prev) => [
          ...prev,
          {
            type: "output",
            content: "/aws-mcp-dashboard",
            timestamp: new Date(),
          },
        ]);
        setIsLoading(false);
        return;
      }

      if (command === "whoami") {
        setEntries((prev) => [
          ...prev,
          {
            type: "output",
            content: "aws-dashboard-user",
            timestamp: new Date(),
          },
        ]);
        setIsLoading(false);
        return;
      }

      // API로 명령어 전송
      const response = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });

      const result = await response.json();

      if (result.error) {
        setEntries((prev) => [
          ...prev,
          {
            type: "error",
            content: result.error,
            timestamp: new Date(),
          },
        ]);
      } else {
        setEntries((prev) => [
          ...prev,
          {
            type: "output",
            content: result.output || "Command executed successfully",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      setEntries((prev) => [
        ...prev,
        {
          type: "error",
          content: `Error executing command: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCommand.trim() || isLoading) return;

    executeCommand(currentCommand);
    setCurrentCommand("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex =
          historyIndex === -1
            ? commandHistory.length - 1
            : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCurrentCommand("");
        } else {
          setHistoryIndex(newIndex);
          setCurrentCommand(commandHistory[newIndex]);
        }
      }
    }
  };

  if (!isTerminalOpen) {
    return (
      <button
        onClick={() => setTerminalOpen(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors z-50"
        title="Open Terminal"
      >
        <TerminalIcon size={20} />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-gray-900 text-green-400 font-mono text-sm border-t border-gray-700 z-40"
      style={{
        height: isTerminalMinimized ? "40px" : `${terminalHeight}px`,
        transition: isDragging ? 'none' : 'height 0.3s ease'
      }}
    >
      {/* Resizer */}
      {!isTerminalMinimized && (
        <div
          className="w-full h-1 bg-gray-700 hover:bg-gray-600 cursor-ns-resize transition-colors"
          onMouseDown={handleMouseDown}
          title="Drag to resize terminal"
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <TerminalIcon size={16} />
          <span className="text-white text-xs">Terminal</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTerminalMinimized(!isTerminalMinimized)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title={isTerminalMinimized ? "Maximize" : "Minimize"}
          >
            {isTerminalMinimized ? (
              <Maximize2 size={14} />
            ) : (
              <Minimize2 size={14} />
            )}
          </button>
          <button
            onClick={() => setTerminalOpen(false)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Close Terminal"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {!isTerminalMinimized && (
        <>
          {/* Terminal Output */}
          <div
            ref={terminalRef}
            className="flex-1 overflow-y-auto px-4 py-2"
            style={{ height: `${terminalHeight - 120}px` }} // 헤더와 입력 영역 제외
          >
            {entries.map((entry, index) => (
              <div
                key={index}
                className={`mb-1 ${
                  entry.type === "command"
                    ? "text-yellow-400"
                    : entry.type === "error"
                    ? "text-red-400"
                    : "text-green-400"
                }`}
              >
                <pre className="whitespace-pre-wrap break-words">
                  {entry.content}
                </pre>
              </div>
            ))}
            {isLoading && (
              <div className="text-blue-400 flex items-center gap-2">
                <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Executing command...</span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-700 px-4 py-3 bg-gray-900">
            <form onSubmit={handleSubmit}>
              <div className="flex items-center gap-2">
                <span className="text-yellow-400">$</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={currentCommand}
                  onChange={(e) => setCurrentCommand(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent outline-none text-green-400"
                  placeholder="Enter command..."
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
