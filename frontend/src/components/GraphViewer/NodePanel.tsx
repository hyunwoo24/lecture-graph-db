"use client";

import { X, Trash2 } from "lucide-react";
import { NODE_ICONS } from "@/lib/graphColors";

interface FGNode {
  id: string;
  name: string;
  label: string;
  color: string;
  props: Record<string, unknown>;
  rawId: number;
}

interface Props {
  node: FGNode;
  onClose: () => void;
  onDelete: () => void;
}

export default function NodePanel({ node, onClose, onDelete }: Props) {
  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{NODE_ICONS[node.label] || "🔵"}</span>
          <div>
            <p className="font-bold text-white">{node.name}</p>
            <p className="text-xs text-gray-500">{node.label}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 mb-6">
        {Object.entries(node.props).map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm">
            <span className="text-gray-500">{k}</span>
            <span className="text-gray-200 text-right max-w-[180px] break-words">{String(v)}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onDelete}
        className="w-full flex items-center justify-center gap-2 bg-red-900/40 hover:bg-red-900/70 border border-red-800 rounded-lg py-2 text-sm text-red-400 transition-colors"
      >
        <Trash2 className="w-4 h-4" /> 노드 삭제
      </button>
    </div>
  );
}
