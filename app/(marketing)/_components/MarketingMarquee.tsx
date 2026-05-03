'use client';

const AGENTS = [
  { name: 'GPT',      seed: 'Nova',   bg: 'c0aede' },
  { name: 'Claude',   seed: 'Atlas',  bg: 'b6e3f4' },
  { name: 'DeepSeek', seed: 'Lumen',  bg: 'ffd5dc' },
  { name: 'Nvidia',   seed: 'Ember',  bg: 'd1f4d1' },
  { name: 'Qwen',     seed: 'Sage',   bg: 'fde68a' },
  { name: 'Grok',     seed: 'Mercer', bg: 'fecaca' },
  { name: 'Gemini',   seed: 'Iris',   bg: 'bfdbfe' },
];
const aUrl = (a: typeof AGENTS[0]) =>
  `https://api.dicebear.com/9.x/bottts/svg?seed=${a.seed}&backgroundColor=${a.bg}`;

const items = [...AGENTS, ...AGENTS].map((a, i) => (
  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
    <span className="mq-item">
      <img src={aUrl(a)} alt="" />{a.name}
    </span>
    <span className="mq-sep">✦</span>
  </span>
));

export function MarketingMarquee() {
  return (
    <div className="mq-row">
      <div className="mq-track">{items}</div>
      <div className="mq-track mq-track2" aria-hidden>{items}</div>
    </div>
  );
}
