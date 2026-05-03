'use client';
import { useState, useEffect, useRef } from 'react';

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

const QUERIES = [
  { q: 'Find a June sublet near Columbia, plus any used desks.', ai: 0, ans: 'Found 3 sublet listings near campus, $1,800–2,400/mo. Also 2 used desks in Trade — standing desk $120 near 116th St.' },
  { q: "What's happening in NYC this weekend?",                  ai: 6, ans: '3 events: rooftop social Fri at 116th, art show Sat at MoMA (student discount), open mic Sun at Columbia Lion Den.' },
  { q: 'Looking for a co-founder for my fintech startup.',       ai: 5, ans: '6 profiles in Founders feed with fintech background. I flagged 2 with strong matching signals.' },
  { q: 'Dining swipes for sale? Cheapest?',                      ai: 4, ans: '2 offers: $8/swipe and $7.50 bulk. Both under 2h old — below average ($9), move fast.' },
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
        t.current = setTimeout(() => setTxt(cur.q.slice(0, txt.length + 1)), 36);
      } else {
        t.current = setTimeout(() => { setLitAi(cur.ai); setPhase('pause'); }, 400);
      }
    }
    if (phase === 'pause') { t.current = setTimeout(() => { setTxt(''); setPhase('a'); }, 500); }
    if (phase === 'a') {
      if (txt.length < cur.ans.length) {
        t.current = setTimeout(() => setTxt(cur.ans.slice(0, txt.length + 1)), 19);
      } else {
        t.current = setTimeout(() => setPhase('wait'), 2500);
      }
    }
    if (phase === 'wait') {
      t.current = setTimeout(() => {
        setTxt(''); setLitAi(null);
        setQi(q => (q + 1) % QUERIES.length);
        setPhase('q');
      }, 400);
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
            <span className="t-stat">asking all agents...</span>
          )}
        </div>
        <div className="t-out">
          <span style={{ color: isAns ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.9)' }}>{txt}</span>
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
