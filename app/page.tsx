"use client";
import { useState, useEffect } from "react";

interface Memory {
  text?: string;
  blob_id?: string;
  blobId?: string;
  distance?: number;
  [key: string]: any;
}

interface Credentials {
  accountId: string;
  delegateKey: string;
  namespace: string;
}

export default function Home() {
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [loginForm, setLoginForm] = useState({ accountId: "", delegateKey: "", namespace: "inspector" });
  const [loginError, setLoginError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState("browse");
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [browseMemories, setBrowseMemories] = useState<Memory[]>([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [success, setSuccess] = useState("");
  const [lastBlobId, setLastBlobId] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("memwal_creds");
    if (saved) setCreds(JSON.parse(saved));
  }, []);

  async function handleLogin() {
    if (!loginForm.accountId || !loginForm.delegateKey) {
      setLoginError("Please fill in all fields.");
      return;
    }
    setConnecting(true);
    setLoginError("");
    const res = await fetch("/api/memwal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test", ...loginForm }),
    });
    const data = await res.json();
    setConnecting(false);
    if (data.success) {
      localStorage.setItem("memwal_creds", JSON.stringify(loginForm));
      setCreds(loginForm);
    } else {
      setLoginError("Could not connect. Please check your credentials.");
    }
  }

  function handleLogout() {
    localStorage.removeItem("memwal_creds");
    setCreds(null);
    setBrowseMemories([]);
    setMemories([]);
    setAnswer("");
  }

  async function apiFetch(body: any) {
    return fetch("/api/memwal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, ...creds }),
    });
  }

  async function loadMemories() {
    setBrowsing(true);
    const res = await apiFetch({ action: "list" });
    const data = await res.json();
    setBrowseMemories(data.memories || []);
    setBrowsing(false);
  }

  useEffect(() => {
    if (creds && activeTab === "browse") loadMemories();
  }, [activeTab, creds]);

  async function handleRemember() {
    if (!text) return;
    setLoading(true);
    setSuccess("");
    setLastBlobId("");
    const res = await apiFetch({ action: "remember", text });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      setSuccess("Memory stored successfully on Walrus!");
      if (data.blob_id) setLastBlobId(data.blob_id);
      setText("");
    }
  }

  async function handleRecall() {
    if (!query) return;
    setLoading(true);
    const res = await apiFetch({ action: "recall", query });
    const data = await res.json();
    setLoading(false);
    setMemories(data.memories || []);
  }

  async function handleAsk() {
    if (!query) return;
    setLoading(true);
    setAnswer("");
    const res = await apiFetch({ action: "ask", query });
    const data = await res.json();
    setLoading(false);
    setAnswer(data.answer || "No answer found.");
  }

  if (!creds) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold mb-2">MemWal Inspector</h1>
          <p className="text-gray-400 mb-8">Enter your MemWal credentials to inspect your agent memory stored on Walrus.</p>
          <div className="bg-gray-900 rounded-xl p-6">
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-1 block">Account ID</label>
              <input
                className="w-full bg-gray-800 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0x..."
                value={loginForm.accountId}
                onChange={(e) => setLoginForm({ ...loginForm, accountId: e.target.value })}
              />
            </div>
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-1 block">Delegate Key</label>
              <input
                type="password"
                className="w-full bg-gray-800 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Your private delegate key"
                value={loginForm.delegateKey}
                onChange={(e) => setLoginForm({ ...loginForm, delegateKey: e.target.value })}
              />
            </div>
            <div className="mb-6">
              <label className="text-sm text-gray-400 mb-1 block">Namespace</label>
              <input
                className="w-full bg-gray-800 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="inspector"
                value={loginForm.namespace}
                onChange={(e) => setLoginForm({ ...loginForm, namespace: e.target.value })}
              />
            </div>
            {loginError && <p className="text-red-400 text-sm mb-4">{loginError}</p>}
            <button
              onClick={handleLogin}
              disabled={connecting}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 py-3 rounded-lg font-medium transition-colors"
            >
              {connecting ? "Connecting to Walrus..." : "Connect"}
            </button>
          </div>
          <p className="text-gray-600 text-xs mt-4 text-center">Credentials are stored locally in your browser only.</p>
        </div>
      </main>
    );
  }

  const tabs = ["browse", "remember", "recall", "ask"];

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">MemWal Inspector</h1>
            <p className="text-gray-400 text-sm">Namespace: <span className="text-purple-400">{creds.namespace}</span></p>
          </div>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-300 transition-colors mt-1">
            Disconnect
          </button>
        </div>
        <div className="flex gap-2 mb-8 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSuccess(""); setMemories([]); setAnswer(""); }}
              className={`px-4 py-2 rounded-lg capitalize font-medium transition-colors ${activeTab === tab ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
            >
              {tab === "browse" ? "Browse" : tab === "remember" ? "Remember" : tab === "recall" ? "Recall" : "Ask"}
            </button>
          ))}
        </div>
        {activeTab === "browse" && (
          <div className="bg-gray-900 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold">Memory Browser</h2>
                <p className="text-gray-400 text-sm mt-1">All memories stored in your Walrus namespace with blob IDs</p>
              </div>
              <button onClick={loadMemories} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition-colors">
                {browsing ? "Loading..." : "Refresh"}
              </button>
            </div>
            {browsing && <div className="text-center py-8 text-gray-500">Loading memories from Walrus...</div>}
            {!browsing && browseMemories.length === 0 && <div className="text-center py-8 text-gray-500">No memories found. Go to Remember tab to store some.</div>}
            {!browsing && browseMemories.length > 0 && (
              <div className="space-y-3">
                <p className="text-gray-400 text-sm mb-3">{browseMemories.length} memories found in namespace</p>
                {browseMemories.map((m, i) => {
                  const blobId = m.blob_id || m.blobId || null;
                  return (
                    <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <p className="text-white text-sm mb-3">{m.text || JSON.stringify(m)}</p>
                      {blobId ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-500">Blob ID:</span>
                          <code className="text-xs text-purple-400 bg-gray-900 px-2 py-1 rounded font-mono break-all">{blobId}</code>
                          <a href={"https://walruscan.com/blob/" + blobId} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline">View on Walrus</a>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600">No blob ID available</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {activeTab === "remember" && (
          <div className="bg-gray-900 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">Store a Memory</h2>
            <p className="text-gray-400 text-sm mb-4">Write anything. It gets encrypted and stored on Walrus.</p>
            <textarea
              className="w-full bg-gray-800 rounded-lg p-4 text-white placeholder-gray-500 resize-none h-32 mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g. User prefers dark mode and uses TypeScript..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button onClick={handleRemember} disabled={loading || !text} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-6 py-2 rounded-lg font-medium transition-colors">
              {loading ? "Storing on Walrus..." : "Store on Walrus"}
            </button>
            {success && (
              <div className="mt-4">
                <p className="text-green-400">{success}</p>
                {lastBlobId && (
                  <div className="mt-2 bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Walrus Blob ID:</p>
                    <code className="text-xs text-purple-400 font-mono break-all">{lastBlobId}</code>
                    <a href={"https://walruscan.com/blob/" + lastBlobId} target="_blank" rel="noopener noreferrer" className="block mt-2 text-xs text-blue-400 hover:text-blue-300 underline">View on Walrus Explorer</a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {activeTab === "recall" && (
          <div className="bg-gray-900 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">Search Memories</h2>
            <p className="text-gray-400 text-sm mb-4">Semantic search across all stored memories. Results ranked by relevance.</p>
            <input
              className="w-full bg-gray-800 rounded-lg p-4 text-white placeholder-gray-500 mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g. What are the user preferences?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRecall()}
            />
            <button onClick={handleRecall} disabled={loading || !query} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-6 py-2 rounded-lg font-medium transition-colors">
              {loading ? "Searching..." : "Search Memories"}
            </button>
            {memories.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="text-gray-400 text-sm">{memories.length} result(s) found</p>
                {memories.map((m, i) => {
                  const blobId = m.blob_id || m.blobId || null;
                  return (
                    <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <p className="text-white text-sm mb-2">{m.text || JSON.stringify(m)}</p>
                      {m.distance !== undefined && (
                        <div className="mb-2">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Relevance</span>
                            <span>{((1 - m.distance) * 100).toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-1.5">
                            <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${(1 - m.distance) * 100}%` }} />
                          </div>
                        </div>
                      )}
                      {blobId && (
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          <span className="text-xs text-gray-500">Blob ID:</span>
                          <code className="text-xs text-purple-400 bg-gray-900 px-2 py-1 rounded font-mono">{blobId.slice(0, 20)}...</code>
                          <a href={"https://walruscan.com/blob/" + blobId} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline">View on Walrus</a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {activeTab === "ask" && (
          <div className="bg-gray-900 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">Ask Your Memory</h2>
            <p className="text-gray-400 text-sm mb-4">Ask a natural language question. GPT answers using only what is stored in Walrus memory.</p>
            <input
              className="w-full bg-gray-800 rounded-lg p-4 text-white placeholder-gray-500 mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g. What does the user prefer?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            />
            <button onClick={handleAsk} disabled={loading || !query} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-6 py-2 rounded-lg font-medium transition-colors">
              {loading ? "Thinking..." : "Ask"}
            </button>
            {answer && (
              <div className="mt-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
                <p className="text-gray-400 text-xs mb-2">Answer from Walrus memory:</p>
                <p className="text-white">{answer}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}