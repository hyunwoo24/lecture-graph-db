export const NODE_COLORS: Record<string, string> = {
  Person: "#ef4444",       // 빨강
  Location: "#3b82f6",     // 파랑
  Event: "#f59e0b",        // 노랑
  Evidence: "#22c55e",     // 초록
  Organization: "#a855f7", // 보라
  Vehicle: "#6b7280",      // 회색
  Phone: "#06b6d4",        // 하늘
  Account: "#eab308",      // 금색
};

export const NODE_ICONS: Record<string, string> = {
  Person: "👤",
  Location: "📍",
  Event: "📅",
  Evidence: "🔍",
  Organization: "🏢",
  Vehicle: "🚗",
  Phone: "📱",
  Account: "💰",
};

export function getNodeColor(labels: string[]): string {
  for (const label of labels) {
    if (NODE_COLORS[label]) return NODE_COLORS[label];
  }
  return "#94a3b8";
}

export function getNodeLabel(labels: string[]): string {
  return labels[0] || "Unknown";
}

export function getNodeName(props: Record<string, unknown>): string {
  return (
    (props.name as string) ||
    (props.number as string) ||
    (props.plate as string) ||
    "?"
  );
}
