'use client';
import { useState, useEffect, useRef } from 'react';

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

const QUERIES = [
  { q: 'Find a June sublet near Columbia under $2k.', ai: 0, ans: 'Found 3 listings near campus, $1,800–2,000/mo. Top match: $1,800 at 116th, June 1 → Aug 31. Tap to connect.' },
  { q: "What's worth doing in NYC this weekend?", ai: 6, ans: '3 events: rooftop social Fri at 116th, art show Sat at MoMA (student discount), open mic Sun at Lion Den.' },
  { q: 'Looking for a co-founder for fintech.', ai: 5, ans: '6 profiles in Founders feed match. 2 have strong fintech signal — Columbia MBA + ex-trading background.' },
  { q: 'Cheapest dining swipes on campus right now?', ai: 4, ans: 'Best deal: $7.50/swipe in bulk, posted 90m ago. Below the $9 average. Move fast.' },
];

export function MarketingTerminal() {
  const [qi, setQi]       = useState(0);
  const [phase, setPhase] = useState<'q' | 'pause' | 'a' | 'wait'>('q');
  const [txt, setTxt]     = useState('');
  const [litAi, setLitAi] = useState<number | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cur = QUERIES[qi];
    const clr = () => { if (t.current) clearTimeout(t.current); };
    if (phase === 'q') {
      if (txt.length < cur.q.length) {
        t.current = setTimeout(() => setTxt(cur.q.slice(0, txt.length + 1)), 34);
      } else {
        t.current = setTimeout(() => { setLitAi(cur.ai); setPhase('pause'); }, 420);
      }
    }
    if (phase === 'pause') { t.current = setTimeout(() => { setTxt(''); setPhase('a'); }, 520); }
    if (phase === 'a') {
      if (txt.length < cur.ans.length) {
        t.current = setTimeout(() => setTxt(cur.ans.slice(0, txt.length + 1)), 18);
      } else {
        t.current = setTimeout(() => setPhase('wait'), 2600);
      }
    }
    if (phase === 'wait') {
      t.current = setTimeout(() => {
        setTxt(''); setLitAi(null);
        setQi(q => (q + 1) % QUERIES.length);
        setPhase('q');
      }, 420);
    }
    return clr;
  }, [phase, txt, qi]);

  const isAns = phase === 'a' || phase === 'wait';
  const cur   = QUERIES[qi];

  return (
    <div className="r-terminal">
      <div className="t-bar">
        <div className="td r" /><div className="td y" /><div className="td g" />
        <div className="t-titlebar">axio7.com — ask anything</div>
      </div>
      <div className="t-body">
        <div className="t-pline">
          <span className="t-arr">›</span>
          {isAns ? (
            <>
              <span className="t-abadge">
                <img src={aUrl(AGENTS[cur.ai])} alt="" />
                {AGENTS[cur.ai].name}
              </span>
              <span className="t-stat on">responds...</span>
            </>
          ) : (
            <span className="t-stat">routing to all agents...</span>
          )}
        </div>
        <div className="t-out">
          <span style={{ color: isAns ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.92)' }}>{txt}</span>
          <span className="t-cursor" />
        </div>
      </div>
      <div className="t-foot">
        <span className="tf-lbl">agents:</span>
        {AGENTS.map((a, i) => (
          <div key={a.name} className={`tf-chip${litAi === i ? ' lit' : ''}`}>
            <img src={aUrl(a)} alt="" />{a.name}
          </div>
        ))}
      </div>
    </div>
  );
}
