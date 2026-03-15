"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { graphApi, GraphNode, GraphRel } from "@/lib/api";
import { getNodeColor, getNodeName, NODE_ICONS } from "@/lib/graphColors";
import NodePanel from "./NodePanel";
import NodeForm from "./NodeForm";
import { RefreshCw, Plus, Trash2 } from "lucide-react";
import type { ForceGraphMethods } from "react-force-graph-2d";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

interface FGNode {
  id: string;
  name: string;
  label: string;
  color: string;
  props: Record<string, unknown>;
  rawId: number;
}

interface FGLink {
  source: string;
  target: string;
  type: string;
  props: Record<string, unknown>;
}

export default function GraphViewer() {
  const [nodes, setNodes] = useState<FGNode[]>([]);
  const [links, setLinks] = useState<FGLink[]>([]);
  const [stats, setStats] = useState({ node_count: 0, rel_count: 0 });
  const [selected, setSelected] = useState<FGNode | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [graph, s] = await Promise.all([graphApi.getFull(), graphApi.getStats()]);
      setNodes(
        graph.nodes.map((n: GraphNode) => ({
          id: String(n.id),
          rawId: n.id,
          name: getNodeName(n.props),
          label: n.labels[0] || "Unknown",
          color: getNodeColor(n.labels),
          props: n.props,
        }))
      );
      setLinks(
        graph.relationships.map((r: GraphRel) => ({
          source: String(r.source),
          target: String(r.target),
          type: r.type,
          props: r.props,
        }))
      );
      setStats(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const handleClear = async () => {
    if (!confirm("전체 그래프를 초기화하시겠습니까?")) return;
    await graphApi.clearAll();
    load();
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 relative">
        {/* 상단 툴바 */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <div className="bg-gray-900/90 border border-gray-700 rounded-lg px-3 py-2 text-sm">
            <span className="text-gray-400">노드 </span>
            <span className="text-white font-bold">{stats.node_count}</span>
            <span className="text-gray-600 mx-2">|</span>
            <span className="text-gray-400">관계 </span>
            <span className="text-white font-bold">{stats.rel_count}</span>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="bg-gray-900/90 border border-gray-700 rounded-lg p-2 hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-red-600 hover:bg-red-700 rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> 노드 추가
          </button>
          <button
            onClick={handleClear}
            className="bg-gray-900/90 border border-gray-700 rounded-lg p-2 hover:bg-red-900/50 hover:border-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* 범례 */}
        <div className="absolute bottom-4 left-4 z-10 bg-gray-900/90 border border-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-2 font-medium">노드 타입</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(NODE_ICONS).map(([label, icon]) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span>{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {nodes.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600">
            <div className="text-center">
              <p className="text-lg mb-2">그래프가 비어있습니다</p>
              <p className="text-sm">노드를 추가하거나 문서를 분석해보세요</p>
            </div>
          </div>
        )}

        <ForceGraph2D
          ref={fgRef}
          graphData={{ nodes, links }}
          nodeId="id"
          nodeLabel={(n) => {
            const node = n as FGNode;
            return `${node.label}: ${node.name}`;
          }}
          nodeColor={(n) => (n as FGNode).color}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const n = node as FGNode & { x: number; y: number };
            const r = 6;
            ctx.beginPath();
            ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
            ctx.fillStyle = n.color;
            ctx.fill();
            ctx.strokeStyle = selected?.id === n.id ? "#fff" : "rgba(255,255,255,0.2)";
            ctx.lineWidth = selected?.id === n.id ? 2 : 0.5;
            ctx.stroke();

            const label = n.name;
            const fontSize = Math.max(10 / globalScale, 3);
            ctx.font = `${fontSize}px sans-serif`;
            ctx.fillStyle = "rgba(255,255,255,0.85)";
            ctx.textAlign = "center";
            ctx.fillText(label, n.x, n.y + r + fontSize);
          }}
          linkLabel={(l) => (l as FGLink).type}
          linkColor={() => "rgba(156,163,175,0.5)"}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          linkCanvasObjectMode={() => "after"}
          linkCanvasObject={(link, ctx) => {
            const l = link as FGLink & { source: { x: number; y: number }; target: { x: number; y: number } };
            if (!l.source?.x) return;
            const mx = (l.source.x + l.target.x) / 2;
            const my = (l.source.y + l.target.y) / 2;
            ctx.font = "3px sans-serif";
            ctx.fillStyle = "rgba(156,163,175,0.8)";
            ctx.textAlign = "center";
            ctx.fillText(l.type, mx, my);
          }}
          onNodeClick={(n) => setSelected(n as FGNode)}
          backgroundColor="#030712"
          width={typeof window !== "undefined" ? window.innerWidth - 224 - (selected ? 320 : 0) : 800}
        />
      </div>

      {selected && (
        <NodePanel
          node={selected}
          onClose={() => setSelected(null)}
          onDelete={async () => {
            await graphApi.deleteNode(selected.rawId);
            setSelected(null);
            load();
          }}
        />
      )}

      {showForm && (
        <NodeForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}
