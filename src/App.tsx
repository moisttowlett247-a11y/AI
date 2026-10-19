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
  CheckCircle2
} from "lucide-react";
import { marked } from "marked";

interface Message {
  role: "user" | "model";
  content: string;
}

export default function App() {
  // Navigation & State
  const [activeTab, setActiveTab] = useState<"chat" | "workspace" | "sandbox">("chat");
  const [persona, setPersona] = useState<string>("general");
  const [model, setModel] = useState<string>("gemini-3.8-flash");
  
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
      content: "Hello! I am **RepoMind AI**, connected directly to your **GitHub Repository**. I have full context of your codebase and can help you write, debug, explain, refactor, and test code in **any programming language** with human-level reasoning."
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

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load connected repository files on mount
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
        fullName: repoName,
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
          model
        })
      });

      const data = await res.json();
      if (data.reply) {
        setMessages([...newMessages, { role: "model", content: data.reply }]);
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
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md z-20 shrink-0">
        
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">RepoMind AI</span>
            <span className="text-[10px] text-blue-400 font-mono block -mt-1">Connected GitHub Repository</span>
          </div>
        </div>

        {/* Zone 2: Navigation Links / Workspace Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${activeTab === 'chat' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            AI Coding Chat
          </button>
          <button
            onClick={() => setActiveTab("workspace")}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${activeTab === 'workspace' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Code Workspace & Diff
          </button>
          <button
            onClick={() => setActiveTab("sandbox")}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${activeTab === 'sandbox' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Sandbox & Tests
          </button>
        </nav>

        {/* Zone 3: Connected GitHub Status Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Github className="w-3.5 h-3.5 text-slate-200" />
            <span className="font-medium truncate max-w-[180px]">GitHub Synchronized</span>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE LAYOUT */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT SIDEBAR: Connected Repository File Inspector */}
        <aside className="w-80 border-r border-slate-800 bg-slate-900/40 flex flex-col shrink-0">
          
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Repository Files</span>
              <button onClick={fetchRepositoryFiles} title="Refresh Repository Files" className="text-slate-400 hover:text-white transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${isRepoLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 truncate mb-3">{repoDescription}</p>

            {/* File Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter files..."
                value={fileSearchQuery}
                onChange={(e) => setFileSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
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
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
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
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="gemini-3.8-flash">Gemini 3.8 Flash (Lightning Fast)</option>
                <option value="gemini-4-argon">Gemini 4 Argon (Advanced Reasoning)</option>
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
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${activeFilePath === item.path ? 'bg-blue-600/20 text-blue-300 font-medium' : 'text-slate-300 hover:bg-slate-800/60'}`}
                >
                  {item.type === 'dir' ? <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" /> : <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                  <span className="truncate">{item.path}</span>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* CENTER / MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          
          {/* TAB 1: CHAT & Q&A */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Chat Messages Feed */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shrink-0 shadow-md">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`max-w-3xl rounded-2xl p-4 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-none shadow-xl'}`}>
                      <div 
                        className="prose prose-invert max-w-none text-xs md:text-sm font-sans [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-slate-800 [&_code]:font-mono [&_code]:text-xs"
                        dangerouslySetInnerHTML={renderMarkdown(msg.content)}
                      />
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-slate-300">You</span>
                      </div>
                    )}
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex gap-4 items-center">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shrink-0 animate-pulse">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 flex items-center gap-3">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                      <span>RepoMind AI is reasoning across your connected repository...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/60 backdrop-blur-md">
                <form onSubmit={handleSendMessage} className="flex gap-3 max-w-5xl mx-auto">
                  <input
                    type="text"
                    placeholder="Ask any coding question in any language (e.g. Optimize this file in Rust, explain architecture, add feature)..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs md:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={isGenerating || !inputMessage.trim()}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 shrink-0"
                  >
                    <span>Ask AI</span>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: CODE WORKSPACE & OPERATIONS */}
          {activeTab === 'workspace' && (
            <div className="flex-1 flex flex-col overflow-hidden p-6 gap-6">
              
              {/* Toolbar */}
              <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-400">Active File: <span className="text-blue-400 font-mono">{activeFilePath || 'Untitled'}</span></span>
                  <select
                    value={workspaceLanguage}
                    onChange={(e) => setWorkspaceLanguage(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-200 focus:outline-none"
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

                <div className="flex items-center gap-2">
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
                    <span>Write Tests</span>
                  </button>
                  <button
                    onClick={handleExecuteSandbox}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-md"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run Simulation</span>
                  </button>
                </div>
              </div>

              {/* Editor & Result Split Grid */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
                
                {/* Code Editor */}
                <div className="flex flex-col bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">{activeFilePath}</span>
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
                <div className="flex flex-col bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">AI Analysis & Refactoring Output</span>
                    {isCodeOpLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />}
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 bg-slate-950 text-xs font-sans text-slate-200 leading-relaxed">
                    {codeOpResult ? (
                      <div 
                        className="prose prose-invert max-w-none text-xs [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-slate-800 [&_code]:font-mono"
                        dangerouslySetInnerHTML={renderMarkdown(codeOpResult)}
                      />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center">
                        <Sparkles className="w-8 h-8 text-slate-600 mb-2" />
                        <p>Click Explain, Refactor, or Write Tests above to let RepoMind AI analyze this file.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: SANDBOX & TESTS */}
          {activeTab === 'sandbox' && (
            <div className="flex-1 flex flex-col overflow-hidden p-6 gap-6">
              <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
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
                  <span>Run Sandbox Execution</span>
                </button>
              </div>

              <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-xl">
                <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono text-slate-300">Console Output & Test Results</span>
                </div>
                <div className="flex-1 bg-slate-950 p-6 font-mono text-xs text-emerald-300 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                  {sandboxOutput}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
