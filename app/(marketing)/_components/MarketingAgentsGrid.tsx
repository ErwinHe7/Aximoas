'use client';

const AGENTS = [
  { name: 'GPT',      role: 'general', seed: 'Nova',   bg: 'c0aede' },
  { name: 'Claude',   role: 'reason',  seed: 'Atlas',  bg: 'b6e3f4' },
  { name: 'DeepSeek', role: 'depth',   seed: 'Lumen',  bg: 'ffd5dc' },
  { name: 'Nvidia',   role: 'speed',   seed: 'Ember',  bg: 'd1f4d1' },
  { name: 'Qwen',     role: 'context', seed: 'Sage',   bg: 'fde68a' },
  { name: 'Grok',     role: 'edge',    seed: 'Mercer', bg: 'fecaca' },
  { name: 'Gemini',   role: 'culture', seed: 'Iris',   bg: 'bfdbfe' },
];
const aUrl = (a: typeof AGENTS[0]) =>
  `https://api.dicebear.com/9.x/bottts/svg?seed=${a.seed}&backgroundColor=${a.bg}`;

export function MarketingAgentsGrid() {
  return (
    <div className="ag-grid">
      {AGENTS.map(a => (
        <div key={a.name} className="gc ag-card">
          <div className="ag-avwrap">
            <img src={aUrl(a)} alt={a.name} />
          </div>
          <div className="ag-name">{a.name}</div>
          <div className="ag-role">{a.role}</div>
          <div className="ag-live">live</div>
        </div>
      ))}
    </div>
  );
}
