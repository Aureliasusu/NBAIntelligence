import { useState, useRef, useEffect } from "react";
import Plot from "react-plotly.js";
import "./Chatbox.css";

const API_BASE = "";

function TableBlock({ columns, rows }) {
  if (!columns?.length) return null;
  return (
    <div className="chatbox-table-wrap">
      <table className="chatbox-table">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(rows || []).slice(0, 50).map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {(rows?.length || 0) > 50 && <p className="chatbox-table-more">Showing first 50 of {rows.length} rows.</p>}
    </div>
  );
}

function PlotBlock({ plotlyJson }) {
  if (!plotlyJson) return null;
  try {
    const fig = typeof plotlyJson === "string" ? JSON.parse(plotlyJson) : plotlyJson;
    return (
      <div className="chatbox-plot-wrap">
        <Plot data={fig.data} layout={{ ...fig.layout, autosize: true }} config={{ responsive: true }} useResizeHandler style={{ width: "100%", minHeight: "320px" }} />
      </div>
    );
  } catch (e) {
    return <p className="chatbox-error">Could not render chart.</p>;
  }
}

function ToolResults({ toolResults }) {
  if (!toolResults?.length) return null;
  return (
    <div className="chatbox-tool-results">
      {toolResults.map((r, i) => (
        <div key={i} className="chatbox-tool-result">
          {r.tool === "query_data" && r.table && <TableBlock columns={r.table.columns} rows={r.table.rows} />}
          {r.tool === "visualize" && (r.plotly_json ? <PlotBlock plotlyJson={r.plotly_json} /> : r.error && <p className="chatbox-error">{r.error}</p>)}
        </div>
      ))}
    </div>
  );
}

export default function Chatbox() {
  const [messages, setMessages] = useState([
    { id: 1, role: "assistant", text: "Hi! I'm your NBA Intelligence assistant. Ask me about players, stats, or the 24-25 season data—I can query the database and show tables and charts.", toolResults: [] },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg = { id: Date.now(), role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const chatMessages = [...messages, userMsg].map((m) => ({ role: m.role, content: m.text }));
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatMessages }),
      });
      if (!res.ok) {
        const text = await res.text();
        let detail = res.statusText;
        try {
          const err = JSON.parse(text);
          detail = err.detail != null ? err.detail : text || detail;
        } catch {
          detail = text || detail;
        }
        throw new Error(detail);
      }
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: data.last_content,
          toolResults: data.tool_results || [],
        },
      ]);
    } catch (err) {
      setError(err.message);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", text: `Error: ${err.message}`, toolResults: [] },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbox">
      <div className="chatbox-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.role}`}>
            <span className="message-avatar">{msg.role === "user" ? "You" : "AI"}</span>
            <div className="message-bubble">
              <p className="message-text">{msg.text}</p>
              {msg.role === "assistant" && msg.toolResults?.length > 0 && <ToolResults toolResults={msg.toolResults} />}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-message assistant">
            <span className="message-avatar">AI</span>
            <div className="message-bubble message-loading">Thinking…</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form className="chatbox-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chatbox-input"
          placeholder="Ask about players, stats, or the game..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          autoFocus
        />
        <button type="submit" className="chatbox-send" aria-label="Send" disabled={loading}>
          Send
        </button>
      </form>
    </div>
  );
}
