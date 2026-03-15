"use client";

import { useState, useEffect } from "react";
import { analysisApi, CentralityRow, CommonLocationRow, TimelineRow, PathResult } from "@/lib/api";
import { BarChart3, Users, MapPin, Clock, GitBranch } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

type Tab = "centrality" | "common-locations" | "timeline" | "path";

export default function AnalysisDashboard() {
  const [tab, setTab] = useState<Tab>("centrality");
  const [centrality, setCentrality] = useState<CentralityRow[]>([]);
  const [commonLocations, setCommonLocations] = useState<CommonLocationRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [pathResult, setPathResult] = useState<PathResult[]>([]);
  const [personName, setPersonName] = useState("");
  const [fromName, setFromName] = useState("");
  const [toName, setToName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (tab === "centrality") loadCentrality();
    if (tab === "common-locations") loadCommonLocations();
  }, [tab]);

  const loadCentrality = async () => {
    setLoading(true);
    try { setCentrality(await analysisApi.getCentrality()); }
    catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  };

  const loadCommonLocations = async () => {
    setLoading(true);
    try { setCommonLocations(await analysisApi.getCommonLocations()); }
    catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  };

  const loadTimeline = async () => {
    if (!personName.trim()) return;
    setLoading(true);
    setError("");
    try { setTimeline(await analysisApi.getTimeline(personName)); }
    catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  };

  const loadPath = async () => {
    if (!fromName.trim() || !toName.trim()) return;
    setLoading(true);
    setError("");
    try { setPathResult(await analysisApi.findPath(fromName, toName)); }
    catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  };

  const TABS = [
    { id: "centrality" as Tab, label: "중심성 분석", icon: BarChart3 },
    { id: "common-locations" as Tab, label: "공모 탐지", icon: MapPin },
    { id: "timeline" as Tab, label: "행동 궤적", icon: Clock },
    { id: "path" as Tab, label: "경로 탐색", icon: GitBranch },
  ];

  const COLORS = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7"];

  return (
    <div className="h-full flex flex-col p-6 gap-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-red-500" /> 분석 대시보드
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">그래프 알고리즘 기반 수사 분석</p>
      </div>

      {/* 탭 */}
      <div className="flex gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setError(""); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
              tab === id ? "bg-red-600 text-white" : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex-1 overflow-y-auto">
        {/* 중심성 분석 */}
        {tab === "centrality" && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h2 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" /> 연결 중심성 — 네트워크 허브 인물
              </h2>
              {loading ? (
                <p className="text-gray-600 text-sm">분석 중...</p>
              ) : centrality.length === 0 ? (
                <p className="text-gray-600 text-sm">데이터가 없습니다. 먼저 수사 문서를 분석하세요.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={centrality} layout="vertical" margin={{ left: 60 }}>
                    <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: "#d1d5db", fontSize: 12 }} width={60} />
                    <Tooltip
                      contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                      labelStyle={{ color: "#f9fafb" }}
                    />
                    <Bar dataKey="degree" name="관계 수">
                      {centrality.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {centrality.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left p-3 text-gray-500 font-medium">순위</th>
                      <th className="text-left p-3 text-gray-500 font-medium">이름</th>
                      <th className="text-left p-3 text-gray-500 font-medium">역할</th>
                      <th className="text-right p-3 text-gray-500 font-medium">관계 수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {centrality.map((row, i) => (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="p-3 text-gray-600">#{i + 1}</td>
                        <td className="p-3 text-white font-medium">{row.name}</td>
                        <td className="p-3 text-gray-400">{row.role || "-"}</td>
                        <td className="p-3 text-right">
                          <span className="bg-red-900/40 text-red-400 rounded px-2 py-0.5">{row.degree}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 공모 탐지 */}
        {tab === "common-locations" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> 같은 날 같은 장소에 있었던 인물 쌍
              </h2>
            </div>
            {loading ? (
              <p className="p-4 text-gray-600 text-sm">분석 중...</p>
            ) : commonLocations.length === 0 ? (
              <p className="p-4 text-gray-600 text-sm">공모 가능성 있는 인물 쌍이 없습니다.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left p-3 text-gray-500 font-medium">인물 1</th>
                    <th className="text-left p-3 text-gray-500 font-medium">인물 2</th>
                    <th className="text-left p-3 text-gray-500 font-medium">장소</th>
                    <th className="text-left p-3 text-gray-500 font-medium">날짜</th>
                    <th className="text-left p-3 text-gray-500 font-medium">시간</th>
                  </tr>
                </thead>
                <tbody>
                  {commonLocations.map((row, i) => (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="p-3 text-white">{row.person1}</td>
                      <td className="p-3 text-white">{row.person2}</td>
                      <td className="p-3 text-blue-400">{row.location}</td>
                      <td className="p-3 text-gray-400">{row.date}</td>
                      <td className="p-3 text-gray-400">{row.time1} / {row.time2}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 행동 궤적 */}
        {tab === "timeline" && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <input
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadTimeline()}
                placeholder="인물 이름 (예: 김철수)"
                className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-700"
              />
              <button
                onClick={loadTimeline}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl px-4 py-2.5 text-sm transition-colors"
              >
                조회
              </button>
            </div>

            {timeline.length > 0 && (
              <div className="relative pl-6">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-800" />
                {timeline.map((row, i) => (
                  <div key={i} className="relative mb-4">
                    <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-red-500" />
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500">{row.date} {row.time}</span>
                        <span className="text-xs bg-red-900/40 text-red-400 rounded px-1.5 py-0.5">{row.action}</span>
                      </div>
                      <p className="text-sm text-white">
                        → <span className="text-blue-400">{row.target}</span>
                        <span className="text-gray-600 ml-1">({row.target_type})</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 경로 탐색 */}
        {tab === "path" && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="시작 인물 (예: 박영수)"
                className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-700"
              />
              <span className="text-gray-600 self-center">→</span>
              <input
                value={toName}
                onChange={(e) => setToName(e.target.value)}
                placeholder="도착 인물 (예: 최민호)"
                className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-700"
              />
              <button
                onClick={loadPath}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl px-4 py-2.5 text-sm transition-colors"
              >
                탐색
              </button>
            </div>

            {pathResult.length > 0 && pathResult.map((r, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-3">{r.hops}단계 연결</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {r.path_nodes.map((node, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <span className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white">
                        {node}
                      </span>
                      {j < r.path_rels.length && (
                        <div className="flex items-center gap-1 text-xs text-red-400">
                          <span>→</span>
                          <span className="bg-red-900/30 rounded px-1.5 py-0.5">{r.path_rels[j]}</span>
                          <span>→</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
