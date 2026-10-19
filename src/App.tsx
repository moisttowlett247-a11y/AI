/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Terminal,
  GitBranch,
  Github,
  Code2,
  Cpu,
  Shield,
  Zap,
  Play,
  Copy,
  Check,
  FileCode,
  Folder,
  Search,
  Settings,
  Sparkles,
  RefreshCw,
  MessageSquare,
  BookOpen,
  Send,
  Menu,
  X,
  Sliders,
  Eye,
  Activity,
  PlusCircle,
  UploadCloud
} from "lucide-react";
import { marked } from "marked";

interface Message {
  role: "user" | "model";
  content: string;
}

export default function App() {
  // Navigation & State
  const [activeTab, setActiveTab] = useState<"chat" | "workspace" | "preview" | "sandbox">("chat");
  const [persona, setPersona] = useState<string>("general");
  const [model, setModel] = useState<string>("gemini-3.8-flash");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState<boolean>(false);

  // GitHub Management State
  const [githubToken, setGithubToken] = useState<string>("");
  const [repoFullName, setRepoFullName] = useState<string>("");
  const [newRepoName, setNewRepoName] = useState<string>("");
  const [newRepoDesc, setNewRepoDesc] = useState<string>("");
  const [isPrivateRepo, setIsPrivateRepo] = useState<boolean>(false);
  const [isCreatingRepo, setIsCreatingRepo] = useState<boolean>(false);
  const [commitMessage, setCommitMessage] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>("");

  // AI Studio Tuning Config State
  const [temperature, setTemperature] = useState<number>(0.1);
  const [topP, setTopP] = useState<number>(0.95);
  const [topK, setTopK] = useState<number>(64);
  const [thinkingLevel, setThinkingLevel] = useState<string>("HIGH");
  const [customSystemInstruction, setCustomSystemInstruction] = useState<string>("");
  const [lastUsage, setLastUsage] = useState<any>(null);

  // Connected GitHub Repository State
  const [repoName, setRepoName] = useState<string>("Connected GitHub Repository");
  const [repoDescription, setRepoDescription] = useState<string>("Synchronized with connected GitHub repository");
  const [fileTree, setFileTree] = useState<any[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string>("src/App.tsx");
  const [activeFileContent, setActiveFileContent] = useState<string>("");
  const [isRepoLoading, setIsRepoLoading] = useState<boolean>(false);
  const [fileSearchQuery, setFileSearchQuery] = useState<string>("");

  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      content: "Hello! I am **RepoMind AI Studio**, your Google AI Studio powered GitHub assistant. You can inspect files, create new GitHub repositories, edit code, commit/push changes, and preview web apps live."
    }
  ]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Code Workspace State
  const [workspaceCode, setWorkspaceCode] = useState<string>('');
  const [workspaceLanguage, setWorkspaceLanguage] = useState<string>("typescript");
  const [codeOpResult, setCodeOpResult] = useState<string>("");
  const [isCodeOpLoading, setIsCodeOpLoading] = useState<boolean>(false);

  // Sandbox State
  const [sandboxOutput, setSandboxOutput] = useState<string>("// Run code execution simulation to see console output and runtime verification.");
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  // Live Preview HTML State
  const [previewHtml, setPreviewHtml] = useState<string>('<!DOCTYPE html>\n<html>\n<head>\n<style>body { font-family: sans-serif; background: #0f172a; color: #fff; padding: 2rem; }</style>\n</head>\n<body>\n<h1>Live Web App Preview</h1>\n<p>Generated UI or HTML components will render here in real-time.</p>\n</body>\n</html>');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRepositoryFiles();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const fetchRepositoryFiles = async () => {
    try {
      setIsRepoLoading(true);
      const res = await fetch("/api/repository/files");
      const data = await res.json();
      if (data.tree) {
        setFileTree(data.tree);
        setRepoName(data.repositoryName || "Connected GitHub Repository");
        setRepoDescription(data.description || "Synchronized with connected GitHub repository");
      }
      if (data.defaultFile) {
        setActiveFilePath(data.defaultFile.path);
        setActiveFileContent(data.defaultFile.content);
        setWorkspaceCode(data.defaultFile.content);
        detectLanguage(data.defaultFile.path);
      }
    } catch (err) {
      console.error("Failed to load repository files:", err);
    } finally {
      setIsRepoLoading(false);
    }
  };

  const loadFileContent = async (path: string) => {
    try {
      setActiveFilePath(path);
      detectLanguage(path);
      setIsMobileMenuOpen(false);
      const res = await fetch("/api/repository/file-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: path })
      });
      const data = await res.json();
      if (data.content !== undefined) {
        setActiveFileContent(data.content);
        setWorkspaceCode(data.content);
      }
    } catch (err) {
      console.error("Failed to load file content:", err);
    }
  };

  const detectLanguage = (path: string) => {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) setWorkspaceLanguage('typescript');
    else if (path.endsWith('.js') || path.endsWith('.jsx')) setWorkspaceLanguage('javascript');
    else if (path.endsWith('.py')) setWorkspaceLanguage('python');
    else if (path.endsWith('.rs')) setWorkspaceLanguage('rust');
    else if (path.endsWith('.go')) setWorkspaceLanguage('go');
    else if (path.endsWith('.cpp') || path.endsWith('.cc')) setWorkspaceLanguage('cpp');
    else if (path.endsWith('.java')) setWorkspaceLanguage('java');
    else if (path.endsWith('.json')) setWorkspaceLanguage('json');
    else if (path.endsWith('.html')) setWorkspaceLanguage('html');
    else if (path.endsWith('.css')) setWorkspaceLanguage('css');
    else setWorkspaceLanguage('plaintext');
  };

  const handleSaveAndCommit = async () => {
    setIsSaving(true);
    setSaveStatus("");
    try {
      const res = await fetch("/api/repository/save-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: activeFilePath,
          content: workspaceCode,
          token: githubToken,
          repoFullName,
          commitMessage: commitMessage || `Update ${activeFilePath} via RepoMind AI Studio`
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus("Successfully saved and committed!");
      } else {
        setSaveStatus(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setSaveStatus(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewRepo = async () => {
    if (!githubToken || !newRepoName) {
      alert("Please enter your GitHub Personal Access Token and a repository name.");
      return;
    }
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
      if (data.success) {
        setRepoFullName(data.repo.full_name);
        alert(`Successfully created GitHub repository: ${data.repo.full_name}`);
        setIsGitHubModalOpen(false);
      } else {
        alert(`Failed to create repository: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error creating repository: ${err.message}`);
    } finally {
      setIsCreatingRepo(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isGenerating) return;

    const userMsg = inputMessage.trim();
    setInputMessage("");
    const newMessages: Message[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setIsGenerating(true);

    try {
      const repoContext = {
        fullName: repoFullName || repoName,
        description: repoDescription,
        activeFilePath,
        activeFileContent: workspaceCode
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: messages,
          persona,
          repoContext,
          model,
          temperature,
          topP,
          topK,
          customSystemInstruction,
          thinkingLevel
        })
      });

      const data = await res.json();
      if (data.reply) {
        setMessages([...newMessages, { role: "model", content: data.reply }]);
        if (data.usage) {
          setLastUsage(data.usage);
        }
      } else {
        setMessages([...newMessages, { role: "model", content: "Error: No response generated from AI." }]);
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages([...newMessages, { role: "model", content: `Error communicating with server: ${err.message}` }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCodeOperation = async (operation: string) => {
    setIsCodeOpLoading(true);
    setCodeOpResult("");
    setActiveTab("workspace");
    try {
      const res = await fetch("/api/code/op", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation,
          code: workspaceCode,
          language: workspaceLanguage
        })
      });
      const data = await res.json();
      if (data.result) {
        setCodeOpResult(data.result);
      } else {
        setCodeOpResult("No result returned.");
      }
    } catch (err: any) {
      setCodeOpResult(`Error: ${err.message}`);
    } finally {
      setIsCodeOpLoading(false);
    }
  };

  const handleExecuteSandbox = async () => {
    setIsExecuting(true);
    setActiveTab("sandbox");
    try {
      const res = await fetch("/api/code/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: workspaceCode,
          language: workspaceLanguage
        })
      });
      const data = await res.json();
      if (data.output) {
        setSandboxOutput(data.output);
      } else {
        setSandboxOutput("No execution output returned.");
      }
    } catch (err: any) {
      setSandboxOutput(`Execution Error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const renderMarkdown = (content: string) => {
    try {
      return { __html: marked.parse(content) };
    } catch {
      return { __html: content };
    }
  };

  const filteredFileTree = fileTree.filter(item => 
    item.path.toLowerCase().includes(fileSearchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* TOP NAVIGATION BAR (Strict 3-zone contract) */}
      <header className="flex items-center justify-between gap-4 px-4 md:px-6 py-3 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md z-30 shrink-0">
        
        {/* Zone 1: Wordmark & Mobile Hamburger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Cpu className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <div>
            <span className="text-base md:text-lg font-bold tracking-tight text-white whitespace-nowrap">RepoMind AI Studio</span>
            <span className="text-[9px] md:text-[10px] text-blue-400 font-mono block -mt-1 truncate max-w-[120px] md:max-w-none">GitHub Management & AI</span>
          </div>
        </div>

        {/* Zone 2: Navigation Links / Workspace Tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${activeTab === 'chat' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            AI Chat
          </button>
          <button
            onClick={() => setActiveTab("workspace")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${activeTab === 'workspace' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Code Workspace
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${activeTab === 'preview' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Live Preview
          </button>
          <button
            onClick={() => setActiveTab("sandbox")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${activeTab === 'sandbox' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Sandbox & Tests
          </button>
        </nav>

        {/* Zone 3: GitHub Manager, AI Studio Config, & Synced Badge */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsGitHubModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-900 text-slate-200 border border-slate-800 hover:bg-slate-800 transition-all shadow-sm"
          >
            <Github className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">GitHub Manager</span>
          </button>

          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl transition-all border ${isConfigOpen ? 'bg-blue-600 text-white border-blue-500 shadow-md' : 'bg-slate-900 text-slate-200 border-slate-800 hover:bg-slate-800'}`}
          >
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">AI Config</span>
          </button>
        </div>
      </header>

      {/* MOBILE TABS BAR */}
      <div className="lg:hidden flex items-center justify-around bg-slate-900 border-b border-slate-800 p-1 shrink-0">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${activeTab === 'chat' ? 'text-blue-400 border-b-2 border-blue-500 font-semibold' : 'text-slate-400'}`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab("workspace")}
          className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${activeTab === 'workspace' ? 'text-blue-400 border-b-2 border-blue-500 font-semibold' : 'text-slate-400'}`}
        >
          Workspace
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${activeTab === 'preview' ? 'text-blue-400 border-b-2 border-blue-500 font-semibold' : 'text-slate-400'}`}
        >
          Preview
        </button>
        <button
          onClick={() => setActiveTab("sandbox")}
          className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${activeTab === 'sandbox' ? 'text-blue-400 border-b-2 border-blue-500 font-semibold' : 'text-slate-400'}`}
        >
          Sandbox
        </button>
      </div>

      {/* MAIN WORKSPACE LAYOUT */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* SIDEBAR: Connected Repository File Inspector (Drawer) */}
        <aside className={`
          absolute md:relative inset-y-0 left-0 z-20 w-80 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 transition-transform duration-300
          ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
        `}>
          
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Repository Files</span>
              <button onClick={fetchRepositoryFiles} title="Refresh Files" className="text-slate-400 hover:text-white transition-colors p-1">
                <RefreshCw className={`w-3.5 h-3.5 ${isRepoLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-[11px] text-blue-400 font-mono truncate mb-3">{repoFullName || 'Connected Workspace'}</p>

            {/* File Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter files..."
                value={fileSearchQuery}
                onChange={(e) => setFileSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Expert Persona & Model Selector */}
          <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-950/30">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">AI Expert Persona</label>
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="general">Universal Coding Master</option>
                <option value="architect">Principal Software Architect</option>
                <option value="security">Elite Security Auditor</option>
                <option value="performance">Performance & Complexity Guru</option>
                <option value="tester">Test Automation & QA Master</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Gemini Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="gemini-3.8-flash">gemini-3.8-flash (Fast)</option>
                <option value="gemini-4-argon">gemini-4-argon (Advanced)</option>
              </select>
            </div>
          </div>

          {/* File Tree List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 block mb-2">Project Files</span>
            {filteredFileTree.length === 0 ? (
              <div className="text-xs text-slate-500 p-3 text-center">No matching files found.</div>
            ) : (
              filteredFileTree.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (item.type === 'file') {
                      loadFileContent(item.path);
                    }
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors text-left ${activeFilePath === item.path ? 'bg-blue-600/20 text-blue-300 font-medium' : 'text-slate-300 hover:bg-slate-800/60'}`}
                >
                  {item.type === 'dir' ? <Folder className="w-4 h-4 text-amber-400 shrink-0" /> : <FileCode className="w-4 h-4 text-blue-400 shrink-0" />}
                  <span className="truncate">{item.path}</span>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* OVERLAY FOR MOBILE DRAWER */}
        {isMobileMenuOpen && (
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/60 z-10 md:hidden backdrop-blur-xs"
          />
        )}

        {/* CENTER / MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          
          {/* TAB 1: CHAT & Q&A */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Chat Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex gap-3 md:gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && (
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shrink-0 shadow-md">
                        <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[85%] md:max-w-3xl rounded-2xl p-3.5 md:p-4 text-xs md:text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-none shadow-xl'}`}>
                      <div 
                        className="prose prose-invert max-w-none text-xs md:text-sm font-sans [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-slate-800 [&_code]:font-mono [&_code]:text-xs overflow-x-auto"
                        dangerouslySetInnerHTML={renderMarkdown(msg.content)}
                      />
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                        <span className="text-[10px] md:text-xs font-bold text-slate-300">You</span>
                      </div>
                    )}
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex gap-3 md:gap-4 items-center">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shrink-0 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 md:p-4 text-xs text-slate-400 flex items-center gap-3">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
                      <span className="truncate">RepoMind AI Studio is generating bug-free code...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 md:p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md">
                <form onSubmit={handleSendMessage} className="flex gap-2 md:gap-3 max-w-5xl mx-auto">
                  <input
                    type="text"
                    placeholder="Ask any coding question in any language (zero bugs guaranteed)..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 md:px-4 py-2.5 md:py-3 text-xs md:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={isGenerating || !inputMessage.trim()}
                    className="px-4 md:px-6 py-2.5 md:py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 shrink-0"
                  >
                    <span className="hidden sm:inline">Run AI</span>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: CODE WORKSPACE & OPERATIONS */}
          {activeTab === 'workspace' && (
            <div className="flex-1 flex flex-col overflow-hidden p-4 md:p-6 gap-4 md:gap-6">
              
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <span className="text-xs font-medium text-slate-400 truncate max-w-[150px] sm:max-w-none">File: <span className="text-blue-400 font-mono">{activeFilePath || 'Untitled'}</span></span>
                  <select
                    value={workspaceLanguage}
                    onChange={(e) => setWorkspaceLanguage(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="typescript">TypeScript</option>
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="rust">Rust</option>
                    <option value="go">Go</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                    <option value="sql">SQL</option>
                    <option value="json">JSON</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleCodeOperation("explain")}
                    disabled={isCodeOpLoading}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                    <span>Explain</span>
                  </button>
                  <button
                    onClick={() => handleCodeOperation("refactor")}
                    disabled={isCodeOpLoading}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Refactor</span>
                  </button>
                  <button
                    onClick={() => handleCodeOperation("test")}
                    disabled={isCodeOpLoading}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tests</span>
                  </button>
                  <button
                    onClick={handleExecuteSandbox}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-md"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run</span>
                  </button>
                </div>
              </div>

              {/* GitHub Commit Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/50 border border-slate-800 p-3 rounded-xl">
                <input
                  type="text"
                  placeholder="Commit message (e.g. Update features)..."
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleSaveAndCommit}
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-white rounded-lg transition-all flex items-center gap-1.5 shadow-md"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{isSaving ? "Saving & Pushing..." : "Commit & Push to GitHub"}</span>
                </button>
                {saveStatus && <span className="text-xs text-emerald-400 font-medium">{saveStatus}</span>}
              </div>

              {/* Editor & Result Split Grid */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 overflow-hidden">
                
                {/* Code Editor */}
                <div className="flex flex-col bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl min-h-[220px]">
                  <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400 truncate max-w-[200px]">{activeFilePath}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(workspaceCode)}
                      className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <textarea
                    value={workspaceCode}
                    onChange={(e) => setWorkspaceCode(e.target.value)}
                    className="flex-1 bg-slate-950 p-4 font-mono text-xs text-slate-200 resize-none focus:outline-none leading-relaxed"
                  />
                </div>

                {/* AI Operation Result / Analysis */}
                <div className="flex flex-col bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl min-h-[220px]">
                  <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">AI Analysis & Refactoring Output</span>
                    {isCodeOpLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />}
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 bg-slate-950 text-xs font-sans text-slate-200 leading-relaxed">
                    {codeOpResult ? (
                      <div 
                        className="prose prose-invert max-w-none text-xs [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-slate-800 [&_code]:font-mono overflow-x-auto"
                        dangerouslySetInnerHTML={renderMarkdown(codeOpResult)}
                      />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-4">
                        <Sparkles className="w-8 h-8 text-slate-600 mb-2" />
                        <p>Click Explain, Refactor, or Write Tests above to let RepoMind AI analyze this file.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: LIVE PREVIEW PLAYGROUND */}
          {activeTab === 'preview' && (
            <div className="flex-1 flex flex-col overflow-hidden p-4 md:p-6 gap-4">
              <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                <div>
                  <h2 className="text-sm font-semibold text-white">Live Web App Preview Sandbox</h2>
                  <p className="text-xs text-slate-400">Test and render HTML, CSS, and JS components in real-time.</p>
                </div>
                <button
                  onClick={() => {
                    const blob = new Blob([previewHtml], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  <span>Open in New Tab</span>
                </button>
              </div>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
                <div className="flex flex-col bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800">
                    <span className="text-xs font-mono text-slate-400">HTML / UI Code Source</span>
                  </div>
                  <textarea
                    value={previewHtml}
                    onChange={(e) => setPreviewHtml(e.target.value)}
                    className="flex-1 bg-slate-950 p-4 font-mono text-xs text-slate-200 resize-none focus:outline-none leading-relaxed"
                  />
                </div>
                <div className="flex flex-col bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-mono text-slate-300">Live Render Frame</span>
                  </div>
                  <div className="flex-1 bg-white overflow-hidden">
                    <iframe
                      srcDoc={previewHtml}
                      title="Live Preview"
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-modals"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SANDBOX & TESTS */}
          {activeTab === 'sandbox' && (
            <div className="flex-1 flex flex-col overflow-hidden p-4 md:p-6 gap-4 md:gap-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                <div>
                  <h2 className="text-sm font-semibold text-white">Virtual Execution & Test Sandbox</h2>
                  <p className="text-xs text-slate-400">Simulate runtime outputs, unit tests, and performance benchmarks instantly.</p>
                </div>
                <button
                  onClick={handleExecuteSandbox}
                  disabled={isExecuting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-white rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  {isExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>Run Sandbox</span>
                </button>
              </div>

              <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-xl">
                <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono text-slate-300">Console Output & Test Results</span>
                </div>
                <div className="flex-1 bg-slate-950 p-4 md:p-6 font-mono text-xs text-emerald-300 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                  {sandboxOutput}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* GITHUB MANAGER MODAL */}
      {isGitHubModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Github className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">GitHub Repository Manager</h3>
              </div>
              <button onClick={() => setIsGitHubModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {/* Token Input */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 block">GitHub Personal Access Token (PAT)</label>
              <input
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-500">Required for creating new repositories and pushing commits to GitHub.</p>
            </div>

            {/* Connected Repo Full Name */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 block">Active Repository (owner/repo)</label>
              <input
                type="text"
                placeholder="e.g. username/my-repo"
                value={repoFullName}
                onChange={(e) => setRepoFullName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <hr className="border-slate-800" />

            {/* Create New Repository Form */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Create New GitHub Repository</h4>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-slate-400 block">Repository Name</label>
                <input
                  type="text"
                  placeholder="my-awesome-project"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 block">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Built with RepoMind AI Studio"
                  value={newRepoDesc}
                  onChange={(e) => setNewRepoDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="privateRepo"
                  checked={isPrivateRepo}
                  onChange={(e) => setIsPrivateRepo(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
                />
                <label htmlFor="privateRepo" className="text-xs text-slate-300">Private Repository</label>
              </div>

              <button
                onClick={handleCreateNewRepo}
                disabled={isCreatingRepo || !newRepoName}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-emerald-600/20"
              >
                {isCreatingRepo ? "Creating Repository..." : "Create New Repository on GitHub"}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsGitHubModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                Close Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI STUDIO CONFIGURATION PANEL DRAWER */}
      {isConfigOpen && (
        <div className="absolute right-0 top-14 bottom-0 w-80 md:w-96 bg-slate-900 border-l border-slate-800 z-40 p-6 flex flex-col shadow-2xl overflow-y-auto space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Google AI Studio Settings</h3>
            </div>
            <button onClick={() => setIsConfigOpen(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Temperature</span>
              <span className="font-mono text-blue-400">{temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-blue-600 bg-slate-950 h-2 rounded-lg cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">Lower values are more precise and deterministic (0.1 for bug-free code).</p>
          </div>

          {/* Top P Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Top P</span>
              <span className="font-mono text-blue-400">{topP}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={topP}
              onChange={(e) => setTopP(parseFloat(e.target.value))}
              className="w-full accent-blue-600 bg-slate-950 h-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* Top K Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Top K</span>
              <span className="font-mono text-blue-400">{topK}</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value))}
              className="w-full accent-blue-600 bg-slate-950 h-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* Thinking Level Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300 block">Thinking Level</label>
            <select
              value={thinkingLevel}
              onChange={(e) => setThinkingLevel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="HIGH">High (Maximum Reasoning)</option>
              <option value="MEDIUM">Medium (Balanced)</option>
              <option value="LOW">Low (Fast)</option>
              <option value="MINIMAL">Minimal (Instant)</option>
            </select>
          </div>

          {/* Custom System Instruction Editor */}
          <div className="space-y-2 flex-1 flex flex-col">
            <label className="text-xs font-medium text-slate-300 block">System Instructions</label>
            <textarea
              value={customSystemInstruction}
              onChange={(e) => setCustomSystemInstruction(e.target.value)}
              placeholder="Enter custom instructions or leave blank to use RepoMind AI's maximum intelligence engineer profile..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono resize-none focus:outline-none focus:border-blue-500 min-h-[140px]"
            />
          </div>

          <button
            onClick={() => setIsConfigOpen(false)}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-blue-600/20"
          >
            Apply Settings
          </button>
        </div>
      )}

    </div>
  );
}
