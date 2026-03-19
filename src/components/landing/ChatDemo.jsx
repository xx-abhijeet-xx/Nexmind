import React, { useEffect, useState, useRef } from 'react';

const MSGS = [
  { role:'user', text:'What can you help me with?' },
  { role:'ai', stream:'I can help with almost anything:\n\n• **Research** — search the web live for current info\n• **Documents** — analyze PDFs and images\n• **Writing** — drafts, summaries, translations\n• **Code** — debug, explain, generate\n\nWhat would you like to start with?' },
  { role:'user', text:'Summarize this PDF for me', attach: true },
  { role:'ai', stream:'Reading your document...\n\nThe report covers **Q3 performance metrics** across 4 business units. Key findings: revenue up 18% YoY, SaaS segment leading at +34%. Two units missed targets due to supply chain delays. Recommended actions outlined in Section 4.' },
];

export default function ChatDemo() {
  const [messages, setMessages] = useState([]);
  const [attachments, setAttachments] = useState(false);
  const [fakeInput, setFakeInput] = useState('Ask anything...');
  const chatRef = useRef(null);

  useEffect(() => {
    let active = false;
    let observer;
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const runLoop = async () => {
      while (active) {
        setMessages([]);
        setAttachments(false);
        setFakeInput('Ask anything...');

        for (let m of MSGS) {
          if (!active) break;

          if (m.role === 'user') {
            let currentStr = '';
            for (let ch of m.text) {
              if (!active) break;
              currentStr += ch;
              setFakeInput(currentStr);
              await sleep(36);
            }
            await sleep(320);
            if (!active) break;
            setFakeInput('Ask anything...');
            setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: m.text }]);
            if (m.attach) setAttachments(true);
            await sleep(500);
          } else {
            const thinkId = Date.now();
            setMessages(prev => [...prev, { id: thinkId, role: 'ai', thinking: true }]);
            await sleep(800);
            if (!active) break;
            setMessages(prev => prev.filter(msg => msg.id !== thinkId));
            const msgId = Date.now() + 1;
            setMessages(prev => [...prev, { id: msgId, role: 'ai', content: '', cursor: true }]);

            let rendered = '';
            for (let i = 0; i < m.stream.length; i++) {
              if (!active) break;
              rendered += m.stream[i];
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === msgId ? { ...msg, content: rendered, cursor: true } : msg
                )
              );
              if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
              await sleep(m.stream[i] === '\n' ? 60 : 14);
            }
            if (!active) break;
            setMessages(prev =>
              prev.map(msg => msg.id === msgId ? { ...msg, cursor: false } : msg)
            );
            await sleep(1400);
          }
        }
        await sleep(2200);
      }
    };

    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !active) {
          active = true;
          runLoop();
        } else if (!entry.isIntersecting) {
          active = false;
        }
      },
      { threshold: 0.2 }
    );

    if (chatRef.current) {
      observer.observe(chatRef.current);
    }

    return () => {
      active = false;
      if (observer) observer.disconnect();
    };
  }, []);

  const sanitize = (str) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const formatText = (txt) => {
    if (!txt) return null;
    const html = sanitize(txt)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className="hero-right">
      <div className="chat-window">
        <div className="chat-titlebar">
          <div className="td r"></div>
          <div className="td y"></div>
          <div className="td g"></div>
          <span className="ttitle">Chymera Chat</span>
          <div className="model-pill">
            <div className="mpulse"></div>Gemini 1.5 Pro
          </div>
        </div>

        <div className="chat-msgs" ref={chatRef}>
          {messages.map(msg => (
            <div key={msg.id} className={`msg ${msg.role}`}>
              <div className="mavatar">{msg.role === 'ai' ? 'C' : 'U'}</div>
              <div className="mbubble">
                {msg.thinking ? (
                  <div className="thinking">
                    <span></span><span></span><span></span>
                  </div>
                ) : (
                  <>
                    {formatText(msg.content)}
                    {msg.cursor && <span className="cursor"></span>}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {attachments && (
          <div className="attach-strip">
            <div className="abadge">📄 report.pdf</div>
            <div className="abadge">🌐 web search</div>
          </div>
        )}

        <div className="chat-bar">
          <div className="fake-input">{fakeInput}</div>
          <button className="send-btn" aria-label="Send">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
              stroke="#0c0c0e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8h10M9 4l4 4-4 4"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
