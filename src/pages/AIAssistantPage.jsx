import Chatbox from "../components/Chatbox";
import "./AIAssistantPage.css";

export default function AIAssistantPage() {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">AI Assistant</h1>
        <p className="page-subtitle">Ask questions and get instant, data-backed answers about the NBA.</p>
      </header>
      <main className="ai-assistant-main">
        <div className="chatbox-wrapper">
          <Chatbox />
        </div>
      </main>
    </>
  );
}
