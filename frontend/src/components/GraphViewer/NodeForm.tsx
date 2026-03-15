"use client";

import { useState } from "react";
import { graphApi } from "@/lib/api";
import { X, Plus, Minus } from "lucide-react";

const LABELS = ["Person", "Location", "Event", "Evidence", "Organization", "Vehicle", "Phone", "Account"];

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export default function NodeForm({ onClose, onSaved }: Props) {
  const [label, setLabel] = useState("Person");
  const [fields, setFields] = useState([{ key: "name", value: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addField = () => setFields([...fields, { key: "", value: "" }]);
  const removeField = (i: number) => setFields(fields.filter((_, idx) => idx !== i));
  const updateField = (i: number, k: "key" | "value", v: string) => {
    const next = [...fields];
    next[i][k] = v;
    setFields(next);
  };

  const handleSave = async () => {
    const props: Record<string, string> = {};
    for (const f of fields) {
      if (f.key && f.value) props[f.key] = f.value;
    }
    if (Object.keys(props).length === 0) {
      setError("최소 하나의 속성을 입력하세요");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await graphApi.createNode(label, props);
      onSaved();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white">노드 추가</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-1 block">노드 타입</label>
          <select
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            {LABELS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>

        <div className="mb-4 space-y-2">
          <label className="text-xs text-gray-500 block">속성</label>
          {fields.map((f, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={f.key}
                onChange={(e) => updateField(i, "key", e.target.value)}
                placeholder="속성명"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600"
              />
              <input
                value={f.value}
                onChange={(e) => updateField(i, "value", e.target.value)}
                placeholder="값"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600"
              />
              <button onClick={() => removeField(i)} className="text-gray-600 hover:text-red-400">
                <Minus className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={addField}
            className="text-xs text-gray-500 hover:text-white flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> 속성 추가
          </button>
        </div>

        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg py-2 text-sm font-medium transition-colors"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
