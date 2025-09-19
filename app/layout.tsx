import { QueryProvider } from "@/components/providers";
import "@uiw/react-markdown-preview/markdown.css";
import "@uiw/react-md-editor/markdown-editor.css";
import "./globals.css";

export const metadata = {
  title: "AWS MCP AI Dashboard",
  description: "AWS 다중 계정과 MCP를 연동한 AI 질의응답 서비스",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
