'use client';
import { useState, useEffect, useRef } from 'react';

const AGENTS = [
  { name: 'GPT',    role: 'general', seed: 'Nova',   bg: 'c0aede' },
  { name: 'Claude', role: 'reason',  seed: 'Atlas',  bg: 'b6e3f4' },
  { name: 'Grok',   role: 'deals',   seed: 'Mercer', bg: 'fecaca' },
];
const aUrl = (a: typeof AGENTS[0]) =>
  `https://api.dicebear.com/9.x/bottts/svg?seed=${a.seed}&backgroundColor=${a.bg}`;

type Msg = { t: 'user' | 'agent'; ai?: number; text: string };

const INITIAL: Msg[] = [
  { t: 'user',  text: 'Find a June sublet near Columbia + any used desks 🏠' },
  { t: 'agent', ai: 0, text: 'Found 3 sublet listings near campus, $1,800–2,400/mo. Also 2 used desks in Trade — standing desk $120 near 116th St.' },
  { t: 'agent', ai: 1, text: "Best move: tap 'I want this' — AXIO7 connects by email, no contact info ever public." },
  { t: 'agent', ai: 2, text: '$1,800 near 116th is the best deal right now. Skip the 20 group chats.' },
];

export function MarketingChat() {
  const [msgs, setMsgs] = useState<Msg[]>(INITIAL);
  const [val, setVal]   = useState('');
  const [busy, setBusy] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [msgs, busy]);

  async function send() {
    const q = val.trim();
    if (!q || busy) return;
    setVal('');
    setMsgs(m => [...m, { t: 'user', text: q }]);
    setBusy(true);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      setBusy(false);
      setMsgs(m => [...m, { t: 'agent', ai: 0, text: data.answer ?? 'Try the full AXIO7 feed for live results.' }]);
    } catch {
      setBusy(false);
      setMsgs(m => [...m, { t: 'agent', ai: 0, text: 'Try the full AXIO7 feed for live results from all 7 agents.' }]);
    }
  }

  return (
    <div className="chat-win">
      <div className="ch-head">
        <img src="/logo.png" style={{ width: 22, height: 22, borderRadius: '50%', padding: 3, background: 'rgba(236,72,214,0.15)' }} alt="" />
        <div>
          <div className="ch-ttl">AXIO7 Chat</div>
          <div className="ch-sub">7 models · live</div>
        </div>
      </div>
      <div className="ch-body" ref={ref}>
        {msgs.map((m, i) => (
          <div key={i} className={`cm${m.t === 'user' ? ' user' : ''}`}>
            <div className="cm-av">
              <img
                src={m.t === 'user'
                  ? 'https://api.dicebear.com/9.x/thumbs/svg?seed=you'
                  : aUrl(AGENTS[m.ai ?? 0])}
                alt=""
              />
            </div>
            <div>
              {m.t === 'agent' && (
                <div className="cm-name">{AGENTS[m.ai ?? 0].name} · {AGENTS[m.ai ?? 0].role}</div>
              )}
              <div className="cm-bub">{m.text}</div>
            </div>
          </div>
        ))}
        {busy && (
          <div className="cm">
            <div className="cm-av"><img src={aUrl(AGENTS[0])} alt="" /></div>
            <div>
              <div className="cm-name">GPT · thinking</div>
              <div className="cm-bub">
                <span className="r-dots"><span /><span /><span /></span>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="ch-foot">
        <input
          className="ch-inp"
          placeholder="Ask anything about Columbia or NYC…"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button className="ch-btn" onClick={send} disabled={busy}>Ask →</button>
      </div>
    </div>
  );
}
