"use client";

import { useState, useRef, useEffect } from "react";
import { askApi, QAResponse } from "@/lib/api";
import { MessageSquare, Send, Code, ChevronDown, ChevronUp } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  cypher?: string;
  rawResults?: Record<string, unknown>[];
}

const SAMPLE_QUESTIONS = [
  "3월 5일 서울역에 있었던 사람은 누구인가?",
  "김철수와 박영수는 어떤 관계인가?",
  "검은색 SUV의 소유자는 누구인가?",
  "피해자 최민호와 연결된 모든 인물을 보여줘",
  "㈜한성물류를 중심으로 한 관계도를 보여줘",
  "네트워크에서 가장 많은 관계를 가진 인물은?",
];

export default function InvestigationChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedCypher, setExpandedCypher] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (question: string) => {
    if (!question.trim() || loading) return;
    const userMsg: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res: QAResponse = await askApi.question(question);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.answer,
          cypher: res.cypher_used,
          rawResults: res.raw_results,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `오류: ${String(e)}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 gap-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-red-500" /> 수사 챗
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">자연어로 수사 질문 → Cypher 자동 생성 → 그래프 탐색 → 답변</p>
      </div>

      {/* 샘플 질문 */}
      {messages.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-3">수사 질문 예시</p>
          <div className="grid grid-cols-2 gap-2">
            {SAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="text-left text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-2xl rounded-xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-red-600 text-white"
                  : "bg-gray-900 border border-gray-800 text-gray-200"
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

              {msg.cypher && (
                <div className="mt-3 border-t border-gray-700 pt-3">
                  <button
                    onClick={() => setExpandedCypher(expandedCypher === i ? null : i)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300"
                  >
                    <Code className="w-3 h-3" />
                    사용된 Cypher
                    {expandedCypher === i ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {expandedCypher === i && (
                    <pre className="mt-2 text-xs bg-gray-950 rounded-lg p-3 text-green-400 overflow-x-auto font-mono">
                      {msg.cypher}
                    </pre>
                  )}
                </div>
              )}

              {msg.rawResults && msg.rawResults.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  조회 결과 {msg.rawResults.length}건
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
          placeholder="수사 질문을 입력하세요..."
          disabled={loading}
          className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-700 disabled:opacity-50"
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl px-4 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
