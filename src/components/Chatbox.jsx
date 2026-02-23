import { useState, useRef, useEffect } from "react";
import "./Chatbox.css";

const PLACEHOLDER_REPLY = "This is a demo. Connect your AI backend to get real responses.";

export default function Chatbox() {
  const [messages, setMessages] = useState([
    { id: 1, role: "assistant", text: "Hi! I'm your NBA Intelligence assistant. Ask me anything about players, stats, or the game." },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg = { id: Date.now(), role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Simulate assistant reply
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", text: PLACEHOLDER_REPLY },
      ]);
    }, 600);
  };

  return (
    <div className="chatbox">
      <div className="chatbox-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.role}`}>
            <span className="message-avatar">{msg.role === "user" ? "You" : "AI"}</span>
            <div className="message-bubble">
              <p className="message-text">{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className="chatbox-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chatbox-input"
          placeholder="Ask about players, stats, or the game..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
        />
        <button type="submit" className="chatbox-send" aria-label="Send">
          Send
        </button>
      </form>
    </div>
  );
}
