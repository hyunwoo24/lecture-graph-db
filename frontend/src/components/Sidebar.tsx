"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Network, FileSearch, MessageSquare, BarChart3, Shield } from "lucide-react";

const NAV = [
  { href: "/", label: "수사 관계도", icon: Network, session: "세션 3~" },
  { href: "/documents", label: "문서 분석기", icon: FileSearch, session: "세션 5" },
  { href: "/chat", label: "수사 챗", icon: MessageSquare, session: "세션 6" },
  { href: "/analysis", label: "분석 대시보드", icon: BarChart3, session: "세션 7~8" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-red-500" />
          <div>
            <p className="text-sm font-bold text-white">Investigation KG</p>
            <p className="text-xs text-gray-500">수사 지식 그래프</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon, session }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-red-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <div>
                <p className="font-medium">{label}</p>
                <p className={`text-xs ${active ? "text-red-200" : "text-gray-600"}`}>{session}</p>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-800">
        <p className="text-xs text-gray-600 text-center">Neo4j + GPT-4o</p>
      </div>
    </aside>
  );
}
