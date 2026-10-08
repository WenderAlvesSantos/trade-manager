export function PreviewRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm">
      <span className="text-white/45">{label}</span>
      <span className="text-right" style={{ color, fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}
