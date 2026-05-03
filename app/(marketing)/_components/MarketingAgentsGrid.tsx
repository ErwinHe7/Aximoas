'use client';

const AGENTS = [
  { name: 'GPT',      role: 'general', seed: 'Nova',   bg: 'ff7ad9' },
  { name: 'Claude',   role: 'reason',  seed: 'Atlas',  bg: 'b96bff' },
  { name: 'DeepSeek', role: 'depth',   seed: 'Lumen',  bg: 'ffb3e9' },
  { name: 'Nvidia',   role: 'speed',   seed: 'Ember',  bg: '8a3df0' },
  { name: 'Qwen',     role: 'context', seed: 'Sage',   bg: 'ff3ec5' },
  { name: 'Grok',     role: 'edge',    seed: 'Mercer', bg: 'ff5fa9' },
  { name: 'Gemini',   role: 'culture', seed: 'Iris',   bg: 'c084fc' },
];
const aUrl = (a: typeof AGENTS[0]) =>
  `https://api.dicebear.com/9.x/bottts/svg?seed=${a.seed}&backgroundColor=${a.bg}`;

export function MarketingAgentsGrid() {
  return (
    <div className="ag-grid">
      {AGENTS.map(a => (
        <div key={a.name} className="gc ag-card">
          <div className="ag-avwrap"><img src={aUrl(a)} alt={a.name} /></div>
          <div className="ag-name">{a.name}</div>
          <div className="ag-role">{a.role}</div>
          <div className="ag-live">live</div>
        </div>
      ))}
    </div>
  );
}
