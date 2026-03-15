"use client";

import { useState, useEffect } from "react";
import { extractApi, samplesApi, ExtractedResult, SampleMeta } from "@/lib/api";
import { NODE_ICONS } from "@/lib/graphColors";
import { FileText, Zap, CheckCircle, ChevronDown, ChevronUp, BookOpen } from "lucide-react";

export default function DocumentAnalyzer() {
  const [text, setText] = useState("");
  const [extracted, setExtracted] = useState<ExtractedResult | null>(null);
  const [samples, setSamples] = useState<SampleMeta[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [expandedEntities, setExpandedEntities] = useState(true);

  useEffect(() => {
    samplesApi.list().then(setSamples).catch(() => {});
  }, []);

  const loadSample = async (id: string) => {
    const doc = await samplesApi.get(id);
    setText(doc.content);
    setExtracted(null);
    setSaved(false);
  };

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setAnalyzing(true);
    setError("");
    setExtracted(null);
    setSaved(false);
    try {
      const result = await extractApi.analyze(text);
      setExtracted(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!extracted) return;
    setSaving(true);
    try {
      await extractApi.save(extracted);
      setSaved(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-500" /> 문서 분석기
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">수사 보고서 텍스트 → LLM 자동 추출 → 그래프 저장</p>
        </div>
      </div>

      {/* 샘플 문서 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
          <BookOpen className="w-3 h-3" /> 샘플 수사 문서 불러오기
        </p>
        <div className="flex flex-wrap gap-2">
          {samples.map((s) => (
            <button
              key={s.id}
              onClick={() => loadSample(s.id)}
              className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-300 transition-colors"
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* 입력 */}
        <div className="flex-1 flex flex-col gap-3">
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setExtracted(null); setSaved(false); }}
            placeholder="수사 보고서, 진술서, 통화 기록 등 텍스트를 입력하세요..."
            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-red-700"
          />
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !text.trim()}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Zap className="w-4 h-4" />
            {analyzing ? "LLM 분석 중..." : "엔티티/관계 추출"}
          </button>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>

        {/* 추출 결과 */}
        {extracted && (
          <div className="w-96 flex flex-col gap-3 overflow-y-auto">
            {/* 엔티티 */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedEntities(!expandedEntities)}
                className="w-full flex items-center justify-between p-3 text-sm font-medium text-gray-300 hover:bg-gray-800"
              >
                <span>엔티티 ({extracted.entities.length})</span>
                {expandedEntities ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedEntities && (
                <div className="divide-y divide-gray-800">
                  {extracted.entities.map((e, i) => (
                    <div key={i} className="p-3 flex items-start gap-2">
                      <span className="text-lg">{NODE_ICONS[e.label] || "🔵"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{e.label}</span>
                          <span className="text-xs text-green-500">{Math.round(e.confidence * 100)}%</span>
                        </div>
                        <div className="text-sm text-gray-200 mt-0.5">
                          {Object.entries(e.properties).map(([k, v]) => (
                            <span key={k} className="mr-2">
                              <span className="text-gray-600">{k}:</span> {String(v)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 관계 */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="p-3 text-sm font-medium text-gray-300 border-b border-gray-800">
                관계 ({extracted.relationships.length})
              </div>
              <div className="divide-y divide-gray-800">
                {extracted.relationships.map((r, i) => (
                  <div key={i} className="p-3 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="bg-gray-800 rounded px-1.5 py-0.5 text-gray-300">{r.from_node.value}</span>
                      <span className="text-red-500 font-mono">→[{r.type}]→</span>
                      <span className="bg-gray-800 rounded px-1.5 py-0.5 text-gray-300">{r.to_node.value}</span>
                    </div>
                    {r.properties && Object.keys(r.properties).length > 0 && (
                      <div className="mt-1 text-gray-600">
                        {Object.entries(r.properties).map(([k, v]) => `${k}: ${v}`).join(", ")}
                      </div>
                    )}
                    <span className="text-green-600">{Math.round(r.confidence * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 저장 버튼 */}
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className={`rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                saved
                  ? "bg-green-900/40 border border-green-700 text-green-400"
                  : "bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              {saved ? "그래프에 저장됨!" : saving ? "저장 중..." : "그래프에 저장"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
