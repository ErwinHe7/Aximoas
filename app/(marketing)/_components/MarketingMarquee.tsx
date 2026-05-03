'use client';

const AGENTS = [
  { name: 'GPT',      seed: 'Nova',   bg: 'ff7ad9' },
  { name: 'Claude',   seed: 'Atlas',  bg: 'b96bff' },
  { name: 'DeepSeek', seed: 'Lumen',  bg: 'ffb3e9' },
  { name: 'Nvidia',   seed: 'Ember',  bg: '8a3df0' },
  { name: 'Qwen',     seed: 'Sage',   bg: 'ff3ec5' },
  { name: 'Grok',     seed: 'Mercer', bg: 'ff5fa9' },
  { name: 'Gemini',   seed: 'Iris',   bg: 'c084fc' },
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
