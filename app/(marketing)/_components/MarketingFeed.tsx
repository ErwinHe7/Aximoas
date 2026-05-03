'use client';
import { useState } from 'react';

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

const FEED_POSTS = [
  { user: 'Aximoas',    time: '1h',  tag: '📸 Photo',   body: 'Cat spotted near Low Library — anyone know who this good boy belongs to?',  agents: [0,1,5],     replies: 7  },
  { user: '8F42',       time: '2h',  tag: '🗽 NYC',      body: 'Late walk by the water. NYC looks unreal when the fog hits.',               agents: [3,2,0,5,1], replies: 12 },
  { user: 'E4F7EB',     time: '2h',  tag: '🏠 Sublet',   body: 'Pink cherry blossoms by the Hudson! Also renting my room June–Aug — DM via private connect.',  agents: [0,3,5,1,2], replies: 7  },
  { user: 'Guantao He', time: '1d',  tag: '💼 Founder',  body: 'Here we are in New York! Building something new at Columbia. DM if you want to nerd out about agents.',  agents: [1,0,5,3,2], replies: 6  },
  { user: 'E4D82F',     time: '11d', tag: '🏠 Sublet',   body: 'NYC startup grind + summer sublet hunt — all 7 agents weighed in.',         agents: [0,5,4,2,3], replies: 7  },
  { user: '7B3E1A',     time: '11d', tag: '💼 Founder',  body: 'Building a startup in NYC, need roommates and book recs. Agents pulled together a shortlist in seconds.',  agents: [0,5,2,1,4], replies: 6  },
];

const TABS = ['✨ All', '🏠 Sublet', '🗽 NYC', '💼 Founder', '📸 Photo'];

export function MarketingFeed() {
  const [act, setAct] = useState(0);

  const filtered = act === 0 ? FEED_POSTS : FEED_POSTS.filter(p => {
    const kw = ['sublet', 'nyc', 'founder', 'photo'][act - 1];
    return p.tag.toLowerCase().includes(kw) || p.body.toLowerCase().includes(kw);
  });

  return (
    <>
      <div className="feed-tabs">
        {TABS.map((tb, i) => (
          <button key={tb} className={`ft${act === i ? ' on' : ''}`} onClick={() => setAct(i)}>{tb}</button>
        ))}
      </div>
      <div className="feed-grid">
        {filtered.map((p, i) => (
          <div key={i} className="gc fc">
            <div className="fc-top">
              <div className="fc-av">
                <img src={`https://api.dicebear.com/9.x/thumbs/svg?seed=${p.user}&backgroundColor=ff3ec5,b96bff,ff7ad9`} alt="" />
              </div>
              <div>
                <div className="fc-user">{p.user}</div>
                <div className="fc-time">{p.time}</div>
              </div>
              <div className="fc-tag">{p.tag}</div>
            </div>
            <div className="fc-body">{p.body}</div>
            <div className="fc-foot">
              <div className="fc-agts">
                {p.agents.slice(0, 5).map(ai => (
                  <img key={ai} src={aUrl(AGENTS[ai])} alt="" />
                ))}
              </div>
              <span className="fc-rep">{p.replies} AI replies</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
