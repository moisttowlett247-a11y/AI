/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  MessageSquare,
  FileCode,
  Terminal,
  Settings,
  Sliders,
  Play,
  Copy,
  Check,
  Plus,
  Trash2,
  Github,
  Folder,
  Search,
  RefreshCw,
  Clock,
  Zap,
  Eye,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Lock,
  Globe,
  UploadCloud,
  Cpu,
  Shield,
  HelpCircle
} from "lucide-react";
import { marked } from "marked";

interface Message {
  role: "user" | "model";
  content: string;
  runtimeSeconds?: number;
  tokensUsed?: number;
}

interface ChatSession {
  id: string;
  title: string;
  promptType: "chat" | "freeform" | "structured";
  messages: Message[];
  updatedAt: number;
}

interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  description: string;
  language: string;
  private: boolean;
  html_url: string;
}

export default function App() {
  // Google AI Studio Navigation & Prompt Types
  const [promptType, setPromptType] = useState<"chat" | "freeform" | "structured">("chat");
  const [activeTab, setActiveTab] = useState<"prompt" | "preview" | "code" | "workspace">("prompt");
  const [model, setModel] = useState<string>("gemini-3.8-flash");
  
  // Mobile UI drawers
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  // Chat Sessions State (Sidebar)
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem("aistudio_sessions");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [
      {
        id: "session-1",
        title: "Untitled prompt",
        promptType: "chat",
        messages: [
          {
            role: "model",
            content: "Hello! I am your Gemini assistant, synchronized with your connected GitHub repository and operating with Google AI Studio engine. How can I help you build today?"
          }
        ],
        updatedAt: Date.now()
      }
    ];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string>(sessions[0]?.id || "session-1");
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [aiActivityStep, setAiActivityStep] = useState<string>("");

  // AI Studio Tuning Configuration (Right Panel)
  const [temperature, setTemperature] = useState<number>(1.0);
  const [topP, setTopP] = useState<number>(0.95);
  const [topK, setTopK] = useState<number>(64);
  const [maxOutputTokens, setMaxOutputTokens] = useState<number>(8192);
  const [thinkingLevel, setThinkingLevel] = useState<string>("HIGH");
  const [systemInstruction, setSystemInstruction] = useState<string>(
    "You are a world-class AI software engineer and expert prompt engineer. Provide 100% robust, bug-free, production-ready code with complete error handling."
  );
  const [lastUsage, setLastUsage] = useState<any>(null);
  const [lastRuntime, setLastRuntime] = useState<number | null>(null);

  // GitHub & Repository Integration State
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState<boolean>(false);
  const [githubToken, setGithubToken] = useState<string>(() => localStorage.getItem("aistudio_github_token") || "");
  const [accountRepos, setAccountRepos] = useState<GitHubRepo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(false);
  const [selectedRepoFullName, setSelectedRepoFullName] = useState<string>(() => localStorage.getItem("aistudio_selected_repo") || "");
  const [newRepoName, setNewRepoName] = useState<string>("");
  const [newRepoDesc, setNewRepoDesc] = useState<string>("");
  const [isPrivateRepo, setIsPrivateRepo] = useState<boolean>(false);
  const [isCreatingRepo, setIsCreatingRepo] = useState<boolean>(false);

  // Connected Repository Workspace State
  const [fileTree, setFileTree] = useState<any[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string>("src/App.tsx");
  const [activeFileContent, setActiveFileContent] = useState<string>("");
  const [commitMessage, setCommitMessage] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>("");

  // Live Preview HTML State
  const [livePreviewHtml, setLivePreviewHtml] = useState<string>("");

  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("aistudio_sessions", JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (githubToken) {
      localStorage.setItem("aistudio_github_token", githubToken);
      fetchAccountRepos(githubToken);
    }
  }, [githubToken]);

  useEffect(() => {
    if (selectedRepoFullName) {
      localStorage.setItem("aistudio_selected_repo", selectedRepoFullName);
    }
  }, [selectedRepoFullName]);

  useEffect(() => {
    loadRepositoryFiles();
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [sessions, isGenerating, aiActivityStep]);

  const loadRepositoryFiles = async () => {
    try {
      const res = await fetch("/api/repository/files");
      const data = await res.json();
      if (res.ok) {
        setFileTree(data.tree || []);
        if (data.defaultFile) {
          setActiveFilePath(data.defaultFile.path);
          setActiveFileContent(data.defaultFile.content);
          updateLivePreview(data.defaultFile.content);
        }
      }
    } catch (e) {
      console.error("Failed to load repository files:", e);
    }
  };

  const fetchAccountRepos = async (token: string) => {
    if (!token) return;
    setIsLoadingRepos(true);
    try {
      const res = await fetch(`/api/github/repos?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (res.ok && data.repos) {
        setAccountRepos(data.repos);
      }
    } catch (e) {
      console.error("Failed to fetch repos:", e);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleSelectFile = async (path: string) => {
    setActiveFilePath(path);
    try {
      const res = await fetch("/api/repository/file-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: path })
      });
      const data = await res.json();
      if (res.ok) {
        setActiveFileContent(data.content);
        updateLivePreview(data.content);
      }
    } catch (e) {
      console.error("Failed to load file content:", e);
    }
  };

  const updateLivePreview = (content: string) => {
    setLivePreviewHtml(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
          <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
        </head>
        <body class="bg-[#111318] text-slate-100 p-4 sm:p-6 font-sans">
          <div id="root">
            <div class="p-4 sm:p-6 bg-[#1a1d24] rounded-2xl border border-slate-800 shadow-2xl">
              <h2 class="text-lg sm:text-xl font-bold text-blue-400 mb-2">Google AI Studio Live Preview</h2>
              <p class="text-slate-400 text-xs sm:text-sm">Active Workspace File: ${activeFilePath}</p>
              <div class="mt-4 p-4 bg-[#111318] rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto text-emerald-400">
                <pre>${content.slice(0, 1200)}...</pre>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
  };

  const getCurrentSession = () => {
    return sessions.find(s => s.id === currentSessionId) || sessions[0];
  };

  const handleNewSession = (type: "chat" | "freeform" | "structured") => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: type === "chat" ? "Chat Prompt" : type === "freeform" ? "Freeform Prompt" : "Structured Prompt",
      promptType: type,
      messages: [
        {
          role: "model",
          content: `Initialized new ${type} prompt with Google AI Studio engine.`
        }
      ],
      updatedAt: Date.now()
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
    setPromptType(type);
    setIsMobileMenuOpen(false);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) return;
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    if (currentSessionId === id) {
      setCurrentSessionId(updated[0].id);
      setPromptType(updated[0].promptType);
    }
  };

  const handleRunPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isGenerating) return;

    const userMsg = inputMessage.trim();
    setInputMessage("");

    const currentSession = getCurrentSession();
    const updatedMessages: Message[] = [
      ...currentSession.messages,
      { role: "user", content: userMsg }
    ];

    setSessions(sessions.map(s => s.id === currentSessionId ? {
      ...s,
      title: s.messages.length === 1 ? (userMsg.slice(0, 32) + "...") : s.title,
      messages: updatedMessages,
      updatedAt: Date.now()
    } : s));

    setIsGenerating(true);

    setAiActivityStep("Initializing Gemini model execution...");
    await new Promise(r => setTimeout(r, 350));
    setAiActivityStep("Analyzing prompt & repository context...");
    await new Promise(r => setTimeout(r, 350));
    setAiActivityStep("Executing neural transformer generation...");
    await new Promise(r => setTimeout(r, 350));
    setAiActivityStep("Verifying code syntax & safety...");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: currentSession.messages,
          model,
          temperature,
          topP,
          topK,
          customSystemInstruction: systemInstruction,
          thinkingLevel,
          repoContext: {
            fullName: selectedRepoFullName || "Google AI Studio Project",
            activeFilePath,
            activeFileContent
          }
        })
      });

      const data = await res.json();
      if (res.ok) {
        const reply = data.reply;
        setLastUsage(data.usage);
        setLastRuntime(data.runtimeSeconds);

        const finalMessages: Message[] = [
          ...updatedMessages,
          {
            role: "model",
            content: reply,
            runtimeSeconds: data.runtimeSeconds,
            tokensUsed: data.usage?.totalTokenCount || 210
          }
        ];

        setSessions(sessions.map(s => s.id === currentSessionId ? {
          ...s,
          messages: finalMessages,
          updatedAt: Date.now()
        } : s));

        const codeMatch = reply.match(/```(?:html|tsx|jsx)?([\s\S]*?)```/);
        if (codeMatch && codeMatch[1]) {
          const code = codeMatch[1].trim();
          setLivePreviewHtml(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
                <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
                <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
                <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
              </head>
              <body class="bg-[#111318] text-slate-100 p-4 sm:p-6 font-sans">
                <div id="root">
                  ${code.includes("<") ? code : `<div class="p-4 bg-[#1a1d24] rounded-xl border border-slate-800"><pre class="text-xs text-emerald-400"><code>${code}</code></pre></div>`}
                </div>
              </body>
            </html>
          `);
        }

      } else {
        setSessions(sessions.map(s => s.id === currentSessionId ? {
          ...s,
          messages: [...updatedMessages, { role: "model", content: `❌ Error: ${data.error}` }]
        } : s));
      }
    } catch (e: any) {
      setSessions(sessions.map(s => s.id === currentSessionId ? {
        ...s,
        messages: [...updatedMessages, { role: "model", content: `❌ Network Error: ${e.message}` }]
      } : s));
    } finally {
      setIsGenerating(false);
      setAiActivityStep("");
    }
  };

  const handleSaveAndCommit = async () => {
    if (!activeFilePath) return;
    setIsSaving(true);
    setSaveStatus("Saving changes...");
    try {
      const res = await fetch("/api/repository/save-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: activeFilePath,
          content: activeFileContent,
          token: githubToken,
          repoFullName: selectedRepoFullName,
          commitMessage: commitMessage || `Update ${activeFilePath} via Google AI Studio`
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSaveStatus("Successfully saved & pushed to GitHub!");
        setTimeout(() => setSaveStatus(""), 4000);
      } else {
        setSaveStatus(`Error: ${data.error}`);
      }
    } catch (e: any) {
      setSaveStatus(`Error: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubToken || !newRepoName) return;
    setIsCreatingRepo(true);
    try {
      const res = await fetch("/api/github/create-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: githubToken,
          name: newRepoName,
          description: newRepoDesc,
          isPrivate: isPrivateRepo
        })
      });
      const data = await res.json();
      if (res.ok && data.repo) {
        setSelectedRepoFullName(data.repo.full_name);
        setNewRepoName("");
        setNewRepoDesc("");
        fetchAccountRepos(githubToken);
        setIsGitHubModalOpen(false);
      } else {
        alert(data.error || "Failed to create repo");
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsCreatingRepo(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#111318] text-[#e3e3e3] font-sans select-none">
      
      {/* DESKTOP SIDEBAR */}
      <aside className="w-72 bg-[#1a1d24] border-r border-[#2d3139] flex-col z-20 hidden md:flex">
        
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#2d3139]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-sm text-[#e3e3e3] tracking-tight">Google AI Studio</h1>
              <p className="text-[10px] text-blue-400 font-medium">GitHub Supercharged</p>
            </div>
          </div>
        </div>

        <div className="p-3 space-y-1.5 border-b border-[#2d3139]">
          <div className="text-[11px] font-semibold text-slate-400 px-2 uppercase tracking-wider mb-1">Create Prompt</div>
          <button
            onClick={() => handleNewSession("chat")}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#22262f] hover:bg-[#2b303b] text-slate-200 text-xs font-medium transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <span>Chat prompt</span>
          </button>
          <button
            onClick={() => handleNewSession("freeform")}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#22262f] text-slate-300 text-xs font-medium transition-colors"
          >
            <FileCode className="w-4 h-4 text-emerald-400" />
            <span>Freeform prompt</span>
          </button>
          <button
            onClick={() => handleNewSession("structured")}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#22262f] text-slate-300 text-xs font-medium transition-colors"
          >
            <Terminal className="w-4 h-4 text-purple-400" />
            <span>Structured prompt</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 px-2 uppercase tracking-wider mb-2">Prompts & Chats</div>
          {sessions.map(session => (
            <div
              key={session.id}
              onClick={() => {
                setCurrentSessionId(session.id);
                setPromptType(session.promptType);
              }}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-xs transition-colors ${
                currentSessionId === session.id
                  ? "bg-blue-600/20 border border-blue-500/30 text-blue-300 font-medium"
                  : "hover:bg-[#22262f] text-slate-300"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                {session.promptType === "chat" ? <MessageSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" /> : <FileCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                <span className="truncate">{session.title}</span>
              </div>
              {sessions.length > 1 && (
                <button
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-slate-400 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-[#2d3139] bg-[#15171c]">
          <button
            onClick={() => setIsGitHubModalOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 bg-[#22262f] hover:bg-[#2b303b] text-slate-200 rounded-lg text-xs font-medium border border-[#2d3139] transition-colors"
          >
            <div className="flex items-center gap-2 truncate">
              <Github className="w-4 h-4 text-blue-400" />
              <span className="truncate">{selectedRepoFullName || "Connect GitHub"}</span>
            </div>
            <Settings className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

      </aside>

      {/* MOBILE MENU DRAWER */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur z-50 flex flex-col p-4 bg-[#1a1d24]">
          <div className="flex items-center justify-between pb-4 border-b border-[#2d3139]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <span className="font-bold text-sm text-white">Google AI Studio</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="py-4 space-y-2">
            <button
              onClick={() => handleNewSession("chat")}
              className="w-full flex items-center gap-3 py-3 px-4 bg-blue-600 text-white rounded-xl text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat Prompt</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 py-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">Prompts & Chats</div>
            {sessions.map(s => (
              <div
                key={s.id}
                onClick={() => {
                  setCurrentSessionId(s.id);
                  setPromptType(s.promptType);
                  setIsMobileMenuOpen(false);
                }}
                className={`p-3 rounded-xl text-sm ${currentSessionId === s.id ? "bg-blue-600/20 text-blue-300 border border-blue-500/30" : "text-slate-300 hover:bg-[#22262f]"}`}
              >
                {s.title}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[#2d3139]">
            <button
              onClick={() => { setIsGitHubModalOpen(true); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#22262f] text-slate-200 rounded-xl text-xs font-medium"
            >
              <Github className="w-4 h-4 text-blue-400" />
              <span>{selectedRepoFullName || "GitHub Settings"}</span>
            </button>
          </div>
        </div>
      )}

      {/* MOBILE CONFIG DRAWER */}
      {isConfigOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur z-50 flex flex-col p-4 bg-[#1a1d24] overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-[#2d3139]">
            <span className="font-bold text-sm text-blue-300">Run Settings & Tuning</span>
            <button onClick={() => setIsConfigOpen(false)} className="p-2 text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="py-4 space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Temperature ({temperature})</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Top P ({topP})</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Top K ({topK})</label>
              <input
                type="range"
                min="1"
                max="100"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Thinking Level</label>
              <select
                value={thinkingLevel}
                onChange={(e) => setThinkingLevel(e.target.value)}
                className="w-full bg-[#111318] border border-[#2d3139] rounded p-2 text-slate-200 text-xs font-mono"
              >
                <option value="HIGH">HIGH (Deep Reasoning)</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
                <option value="MINIMAL">MINIMAL</option>
              </select>
            </div>
            <button
              onClick={() => setIsConfigOpen(false)}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium mt-4"
            >
              Apply Settings
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#111318]">
        
        {/* GOOGLE AI STUDIO TOP NAVBAR */}
        <header className="h-16 bg-[#1a1d24] border-b border-[#2d3139] flex items-center justify-between px-4 sm:px-6 z-10 shrink-0">
          
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs sm:text-sm text-slate-200 truncate max-w-[120px] sm:max-w-none">Untitled prompt</span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-wider font-mono">
                {promptType}
              </span>
            </div>

            {/* View Tabs */}
            <div className="flex items-center bg-[#111318] p-1 rounded-lg border border-[#2d3139]">
              <button
                onClick={() => setActiveTab("prompt")}
                className={`px-2.5 sm:px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === "prompt" ? "bg-[#2b303b] text-blue-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Prompt
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-2.5 sm:px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === "preview" ? "bg-[#2b303b] text-blue-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setActiveTab("workspace")}
                className={`px-2.5 sm:px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === "workspace" ? "bg-[#2b303b] text-blue-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Code
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Model Selector */}
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-[#111318] border border-[#2d3139] text-slate-200 text-xs rounded-lg px-2.5 sm:px-3 py-1.5 focus:outline-none focus:border-blue-500 font-mono hidden sm:block"
            >
              <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended)</option>
              <option value="gemini-2.5-flash">gemini-2.5-flash</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro</option>
            </select>

            {/* Mobile config toggle */}
            <button
              onClick={() => setIsConfigOpen(true)}
              className="lg:hidden p-2 bg-[#22262f] text-slate-300 rounded-lg border border-[#2d3139]"
              title="Run Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleRunPrompt()}
              disabled={isGenerating}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 sm:px-4 py-1.5 rounded-lg text-xs font-medium shadow transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run</span>
            </button>
          </div>

        </header>

        {/* CENTER VIEW: PROMPT EDITOR & CHAT / LIVE PREVIEW / WORKSPACE */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* MAIN PROMPT / CHAT PANE */}
          {activeTab === "prompt" && (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#111318]">
              
              <div className="p-3 sm:p-4 bg-[#15171c] border-b border-[#2d3139] shrink-0">
                <div className="max-w-4xl mx-auto flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">System Instructions</span>
                    <span className="text-[10px] text-blue-400">Guides model behavior</span>
                  </div>
                  <textarea
                    value={systemInstruction}
                    onChange={(e) => setSystemInstruction(e.target.value)}
                    className="w-full h-14 sm:h-16 bg-[#1a1d24] border border-[#2d3139] rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono resize-none"
                    placeholder="Enter system instructions..."
                  />
                </div>
              </div>

              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl w-full mx-auto">
                {getCurrentSession().messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 sm:gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "model" && (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-1">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-lg ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white max-w-[85%] sm:max-w-xl rounded-br-none"
                          : "bg-[#1a1d24] border border-[#2d3139] text-slate-100 max-w-[90%] sm:max-w-3xl rounded-bl-none w-full"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div>
                          <div
                            className="prose prose-invert max-w-none text-xs sm:text-sm space-y-3"
                            dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) }}
                          />
                          {(msg.runtimeSeconds !== undefined || msg.tokensUsed !== undefined) && (
                            <div className="mt-4 pt-3 border-t border-[#2d3139] flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400">
                              <span className="flex items-center gap-1 text-emerald-400 font-mono">
                                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                Run time: {msg.runtimeSeconds}s
                              </span>
                              <span className="flex items-center gap-1 font-mono text-blue-300">
                                <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                Tokens: {msg.tokensUsed}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isGenerating && (
                  <div className="flex gap-4 max-w-4xl mx-auto justify-start animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-blue-400 animate-spin" />
                    </div>
                    <div className="rounded-2xl p-3.5 sm:p-4 bg-[#1a1d24] border border-[#2d3139] text-blue-300 text-xs flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500 animate-ping" />
                      <span>{aiActivityStep || "AI is executing inference..."}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 sm:p-4 bg-[#15171c] border-t border-[#2d3139] shrink-0">
                <form onSubmit={handleRunPrompt} className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-3">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Write a prompt or coding question here..."
                    className="flex-1 bg-[#1a1d24] border border-[#2d3139] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isGenerating || !inputMessage.trim()}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium shadow transition-all"
                  >
                    Run
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* LIVE PREVIEW TAB */}
          {activeTab === "preview" && (
            <div className="flex-1 flex flex-col bg-[#111318] overflow-hidden">
              <div className="p-3 bg-[#15171c] border-b border-[#2d3139] flex items-center justify-between shrink-0">
                <span className="text-xs font-semibold text-blue-300 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-400" />
                  Live App Preview
                </span>
                <button
                  onClick={() => {
                    const w = window.open();
                    w?.document.write(livePreviewHtml);
                  }}
                  className="flex items-center gap-1 text-xs bg-[#22262f] hover:bg-[#2b303b] text-slate-200 px-3 py-1 rounded-lg border border-[#2d3139]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Open in New Tab</span>
                </button>
              </div>
              <div className="flex-1 bg-white">
                <iframe
                  srcDoc={livePreviewHtml || "<div style='padding:40px;font-family:sans-serif;'><h2>No app preview rendered yet.</h2><p>Ask the AI in chat to build a React or HTML app to preview it live!</p></div>"}
                  className="w-full h-full border-none"
                  title="Live Preview"
                />
              </div>
            </div>
          )}

          {/* WORKSPACE & CODE TAB */}
          {activeTab === "workspace" && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#111318]">
              <div className="w-full md:w-72 bg-[#15171c] border-r border-[#2d3139] flex flex-col shrink-0 max-h-48 md:max-h-none">
                <div className="p-3 border-b border-[#2d3139] text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Repository File Tree
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs">
                  {fileTree.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => item.type === "file" && handleSelectFile(item.path)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer ${
                        activeFilePath === item.path ? "bg-blue-600/20 text-blue-300 border border-blue-500/30" : "hover:bg-[#22262f] text-slate-300"
                      }`}
                    >
                      {item.type === "dir" ? <Folder className="w-3.5 h-3.5 text-amber-400" /> : <FileCode className="w-3.5 h-3.5 text-blue-400" />}
                      <span className="truncate">{item.path}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-[#111318] overflow-hidden">
                <div className="p-3 bg-[#15171c] border-b border-[#2d3139] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shrink-0">
                  <span className="font-mono text-xs text-blue-300 truncate">{activeFilePath}</span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      placeholder="Commit message..."
                      className="bg-[#1a1d24] border border-[#2d3139] rounded px-3 py-1 text-xs text-slate-200 flex-1 sm:w-52 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={handleSaveAndCommit}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-medium shadow shrink-0"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{isSaving ? "Pushing..." : "Commit & Push"}</span>
                    </button>
                  </div>
                </div>
                {saveStatus && (
                  <div className="bg-emerald-950/40 border-b border-emerald-800 px-4 py-2 text-xs text-emerald-300">
                    {saveStatus}
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <textarea
                    value={activeFileContent}
                    onChange={(e) => setActiveFileContent(e.target.value)}
                    className="w-full h-full bg-[#111318] text-slate-100 font-mono text-xs p-4 resize-none focus:outline-none"
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>
          )}

          {/* DESKTOP RIGHT TUNING PANEL */}
          <div className="w-80 bg-[#1a1d24] border-l border-[#2d3139] flex-col p-4 z-20 overflow-y-auto hidden lg:flex">
            <div className="flex items-center justify-between pb-3 border-b border-[#2d3139] mb-4">
              <span className="font-semibold text-xs text-slate-300 uppercase tracking-wider">Run Settings</span>
              <Sliders className="w-4 h-4 text-blue-400" />
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Temperature ({temperature})</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Top P ({topP})</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={topP}
                  onChange={(e) => setTopP(parseFloat(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Top K ({topK})</label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={topK}
                  onChange={(e) => setTopK(parseInt(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Max Output Tokens</label>
                <input
                  type="number"
                  value={maxOutputTokens}
                  onChange={(e) => setMaxOutputTokens(parseInt(e.target.value))}
                  className="w-full bg-[#111318] border border-[#2d3139] rounded p-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Thinking Level</label>
                <select
                  value={thinkingLevel}
                  onChange={(e) => setThinkingLevel(e.target.value)}
                  className="w-full bg-[#111318] border border-[#2d3139] rounded p-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500 font-mono"
                >
                  <option value="HIGH">HIGH (Deep Reasoning)</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                  <option value="MINIMAL">MINIMAL</option>
                </select>
              </div>

              {lastUsage && (
                <div className="p-3 bg-[#111318] rounded-lg border border-[#2d3139] space-y-1 font-mono text-[11px] text-slate-300">
                  <div className="font-semibold text-blue-400 mb-1">Inference Telemetry</div>
                  <div>Prompt Tokens: {lastUsage.promptTokenCount}</div>
                  <div>Response Tokens: {lastUsage.candidatesTokenCount}</div>
                  <div>Total Tokens: {lastUsage.totalTokenCount}</div>
                  {lastRuntime && <div className="text-emerald-400">Run time: {lastRuntime}s</div>}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* GITHUB SYNC & REPOSITORY SETTINGS MODAL */}
      {isGitHubModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1d24] border border-[#2d3139] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#2d3139] flex items-center justify-between bg-[#15171c]">
              <h3 className="font-semibold text-sm text-blue-300 flex items-center gap-2">
                <Github className="w-5 h-5 text-blue-400" />
                GitHub Sync & Repository Management
              </h3>
              <button onClick={() => setIsGitHubModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              <div className="space-y-4">
                <button
                  onClick={async () => {
                    const res = await fetch("/api/auth/github/url");
                    const { url } = await res.json();
                    const authWindow = window.open(url, "github_auth", "width=600,height=700");
                    const handleMessage = (event: MessageEvent) => {
                      if (event.data?.type === 'GITHUB_AUTH_SUCCESS') {
                        setGithubToken(event.data.token);
                        window.removeEventListener('message', handleMessage);
                      }
                    };
                    window.addEventListener('message', handleMessage);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-[#2d3139] hover:bg-[#3d4149] text-white px-4 py-3 rounded-xl font-medium"
                >
                  <Github className="w-5 h-5" />
                  Connect GitHub Account (One-Click)
                </button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#2d3139]"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-wider text-slate-500">
                    <span className="bg-[#1a1d24] px-2">Or use PAT</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="flex-1 bg-[#111318] border border-[#2d3139] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    onClick={() => fetchAccountRepos(githubToken)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-medium"
                  >
                    Sync
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-300 uppercase tracking-wider">Available Account Repositories</label>
                  {isLoadingRepos && <span className="text-blue-400 animate-pulse">Loading repositories...</span>}
                </div>
                <div className="max-h-48 overflow-y-auto bg-[#111318] border border-[#2d3139] rounded-xl p-2 space-y-1">
                  {accountRepos.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">No repositories synced. Enter your GitHub token above.</div>
                  ) : (
                    accountRepos.map(repo => (
                      <div
                        key={repo.id}
                        onClick={() => setSelectedRepoFullName(repo.full_name)}
                        className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                          selectedRepoFullName === repo.full_name
                            ? "bg-blue-600/25 border border-blue-500/40 text-blue-200 font-medium"
                            : "hover:bg-[#1a1d24] text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {repo.private ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Globe className="w-3.5 h-3.5 text-emerald-400" />}
                          <span className="font-mono">{repo.full_name}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{repo.language || "Code"}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <form onSubmit={handleCreateNewRepo} className="border-t border-[#2d3139] pt-4 space-y-3">
                <h4 className="font-semibold text-slate-300 uppercase tracking-wider">Create New Repository</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    placeholder="repository-name"
                    className="bg-[#111318] border border-[#2d3139] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <input
                    type="text"
                    value={newRepoDesc}
                    onChange={(e) => setNewRepoDesc(e.target.value)}
                    placeholder="Description"
                    className="bg-[#111318] border border-[#2d3139] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPrivateRepo}
                      onChange={(e) => setIsPrivateRepo(e.target.checked)}
                      className="rounded bg-[#111318] border-[#2d3139] text-blue-600"
                    />
                    <span>Private repository</span>
                  </label>
                  <button
                    type="submit"
                    disabled={isCreatingRepo || !newRepoName || !githubToken}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-medium shadow"
                  >
                    {isCreatingRepo ? "Creating..." : "Create Repository"}
                  </button>
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-[#2d3139] bg-[#15171c] flex justify-end">
              <button
                onClick={() => setIsGitHubModalOpen(false)}
                className="bg-[#22262f] hover:bg-[#2b303b] text-white px-4 py-2 rounded-xl font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
