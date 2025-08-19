import React, { useEffect, useRef, useState } from 'react';
import './App.css';

const WS_URL =
  (window.location.protocol === 'https:' ? 'wss' : 'ws') +
  '://' +
  (window.location.hostname || 'localhost') +
  ':5000/ws';

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function App() {
  const [ws, setWs] = useState(null);
  const [online, setOnline] = useState(false);
  const [username, setUsername] = useState(localStorage.getItem('name') || 'Anonymous');
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);

  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    setWs(socket);

    socket.addEventListener('open', () => setOnline(true));
    socket.addEventListener('close', () => setOnline(false));
    socket.addEventListener('error', () => setOnline(false));

    socket.addEventListener('message', (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type === 'history' && Array.isArray(data.messages)) {
          setMessages(data.messages);
        } else if (data.type === 'message') {
          setMessages(prev => [...prev, data]);
        }
      } catch (e) {
        console.error('Bad ws message', e);
      }
    });

    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('name', username);
  }, [username]);

  function sendMsg(e) {
    e.preventDefault();
    if (!text.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'message', username, text: text.trim() }));
    setText('');
  }

  return (
    <div className="wrap">
      <header className="topbar">
        <div className="brand">Real-Time Chat</div>
        <div className="status">{online ? <span className="online">Online</span> : <span className="offline">Offline</span>}</div>
      </header>

      <main className="main">
        <aside className="sidebar">
          <div className="profile">
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Your name" />
            <div className="muted">Name saved locally</div>
          </div>
        </aside>

        <section className="chat">
          <div ref={listRef} className="messages">
            {messages.map(m => (
              <div key={m.id || m.ts} className={`msg ${m.username === username ? 'me' : 'other'}`}>
                <div className="meta">
                  <strong>{m.username}</strong>
                  <span className="time">{formatTime(m.ts)}</span>
                </div>
                <div className="text">{m.text}</div>
              </div>
            ))}
          </div>

          <form className="composer" onSubmit={sendMsg}>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Type a message (Enter to send)" />
            <button type="submit" disabled={!online || !text.trim()}>Send</button>
          </form>
        </section>
      </main>

      <footer className="footer">Demo • Message history stored server-side (in-memory)</footer>
    </div>
  );
}
