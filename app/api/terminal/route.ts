import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// 허용된 명령어 패턴
const ALLOWED_COMMANDS = [
  /^aws\s+/,      // AWS CLI 명령어
  /^ls(\s|$)/,    // ls 명령어
  /^pwd(\s|$)/,   // pwd 명령어
  /^whoami(\s|$)/, // whoami 명령어
  /^date(\s|$)/,  // date 명령어
  /^echo\s+/,     // echo 명령어
  /^cat\s+/,      // cat 명령어 (제한적으로)
  /^head\s+/,     // head 명령어
  /^tail\s+/,     // tail 명령어
  /^grep\s+/,     // grep 명령어
  /^find\s+/,     // find 명령어
  /^tree(\s|$)/,  // tree 명령어
];

// 금지된 명령어 패턴
const FORBIDDEN_COMMANDS = [
  /rm\s+/,        // 파일 삭제
  /rmdir\s+/,     // 디렉토리 삭제
  /mv\s+/,        // 파일 이동
  /cp\s+/,        // 파일 복사
  /chmod\s+/,     // 권한 변경
  /chown\s+/,     // 소유자 변경
  /sudo\s+/,      // sudo 명령어
  /su\s+/,        // 사용자 전환
  /passwd\s+/,    // 패스워드 변경
  /kill\s+/,      // 프로세스 종료
  /killall\s+/,   // 프로세스 일괄 종료
  /wget\s+/,      // 파일 다운로드
  /curl.*-o/,     // 파일 다운로드가 포함된 curl
  />\s*[^&]/,     // 파일 리다이렉션
  />>/,           // 파일 추가
  /^cd(\s|$)/,    // cd 명령어 금지
];

function isCommandAllowed(command: string): boolean {
  const trimmedCommand = command.trim().toLowerCase();

  // 금지된 명령어 확인
  for (const forbidden of FORBIDDEN_COMMANDS) {
    if (forbidden.test(trimmedCommand)) {
      return false;
    }
  }

  // 허용된 명령어 확인
  for (const allowed of ALLOWED_COMMANDS) {
    if (allowed.test(trimmedCommand)) {
      return true;
    }
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const { command } = await request.json();

    if (!command || typeof command !== 'string') {
      return NextResponse.json(
        { error: "Invalid command" },
        { status: 400 }
      );
    }

    // 명령어 안전성 검사
    if (!isCommandAllowed(command)) {
      return NextResponse.json(
        { error: `Command not allowed: ${command}` },
        { status: 403 }
      );
    }

    try {
      // 명령어 실행 (타임아웃 10초)
      const { stdout, stderr } = await execAsync(command, {
        timeout: 10000,
        maxBuffer: 1024 * 1024, // 1MB 버퍼 제한
        cwd: process.cwd(),
      });

      // 출력 결합 (stderr가 있으면 포함)
      let output = stdout;
      if (stderr) {
        output += stderr ? `\nSTDERR:\n${stderr}` : '';
      }

      return NextResponse.json({
        output: output || 'Command executed successfully (no output)',
        error: null,
      });

    } catch (execError: any) {
      // 실행 에러 처리
      let errorMessage = 'Command execution failed';

      if (execError.code === 'ETIMEDOUT') {
        errorMessage = 'Command timed out (10s limit)';
      } else if (execError.code) {
        errorMessage = `Command failed with exit code ${execError.code}`;
      }

      // stderr이 있으면 포함
      if (execError.stderr) {
        errorMessage += `\n${execError.stderr}`;
      }

      return NextResponse.json({
        output: null,
        error: errorMessage,
      });
    }

  } catch (error) {
    console.error("Terminal API error:", error);
    return NextResponse.json(
      {
        output: null,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}