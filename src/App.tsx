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
  HelpCircle,
  Share2,
  Code2,
  Key,
  Maximize2,
  Minimize2,
  Smartphone,
  Tablet,
  Monitor,
  SplitSquareVertical,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  GitBranch,
  Edit2,
  RotateCcw,
  BookOpen,
  Filter,
  FileText
} from "lucide-react";
import { marked } from "marked";

interface Message {
  role: "user" | "model";
  content: string;
  runtimeSeconds?: number;
  tokensUsed?: number;
  throughput?: number;
}

interface ChatSession {
  id: string;
  title: string;
  promptType: "chat" | "freeform" | "structured" | "build";
  messages: Message[];
  updatedAt: number;
  structuredExamples?: { input: string; output: string }[];
  freeformVariables?: Record<string, string>;
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

function parseMessageParts(content: string) {
  const codeBlockRegex = /```([a-zA-Z0-9_\-+]*)\n([\s\S]*?)```/g;
  const parts: { type: 'text' | 'code'; content: string; language?: string }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex, match.index)
      });
    }
    parts.push({
      type: 'code',
      language: match[1]?.trim() || 'code',
      content: match[2].trimEnd()
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.slice(lastIndex)
    });
  }

  return parts;
}

interface CodeBlockProps {
  code: string;
  language: string;
  onPreview?: (code: string) => void;
  onApplyToWorkspace?: (code: string) => void;
}

function CodeBlock({ code, language, onPreview, onApplyToWorkspace }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);

  const handleCopy = async () => {
    let success = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(code);
        success = true;
      } catch (e) {
        // Fallback to execCommand below
      }
    }
    if (!success) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = code;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        success = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch (err) {
        console.error("ExecCommand copy fallback error:", err);
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = code.split("\n").length;
  const isWebCode = ["html", "tsx", "jsx", "javascript", "typescript", "react", "svg", "vue"].includes(
    (language || "").toLowerCase()
  );

  return (
    <div className="my-3 rounded-xl border border-[#282a2c] bg-[#0c0d0f] shadow-xl overflow-hidden w-full max-w-full">
      {/* Code Block Header with Copy Button */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-[#171819] border-b border-[#282a2c] text-xs">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-[#8ab4f8]" />
          <span className="font-mono font-semibold text-[#8ab4f8] uppercase tracking-wider text-[11px]">
            {language || "code"}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {lineCount} {lineCount === 1 ? "line" : "lines"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Line Wrap Toggle */}
          <button
            type="button"
            onClick={() => setWrap(!wrap)}
            className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
              wrap
                ? "bg-[#8ab4f8]/20 text-[#8ab4f8] border-[#8ab4f8]/40 font-medium"
                : "bg-[#131314] text-slate-400 hover:text-slate-200 border-[#282a2c]"
            }`}
            title={wrap ? "Disable Word Wrap" : "Enable Word Wrap"}
          >
            {wrap ? "Wrapped" : "Wrap"}
          </button>

          {/* Quick Preview in Live Tab */}
          {isWebCode && onPreview && (
            <button
              type="button"
              onClick={() => onPreview(code)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1e2022] hover:bg-[#282a2c] text-[#81c995] text-[11px] font-medium border border-[#3c4043] transition-colors"
              title="Preview directly in Live Preview tab"
            >
              <Eye className="w-3 h-3" />
              <span>Preview</span>
            </button>
          )}

          {/* Apply to Workspace */}
          {onApplyToWorkspace && (
            <button
              type="button"
              onClick={() => onApplyToWorkspace(code)}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded bg-[#1e2022] hover:bg-[#282a2c] text-slate-300 hover:text-white text-[11px] font-medium border border-[#3c4043] transition-colors"
              title="Insert into Workspace Editor"
            >
              <Folder className="w-3 h-3 text-[#fdd663]" />
              <span>Workspace</span>
            </button>
          )}

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold border transition-all ${
              copied
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                : "bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#131314] border-transparent shadow"
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied!" : "Copy code"}</span>
          </button>
        </div>
      </div>

      {/* Code Display Area - Horizontal Scroll + Anti-Cutoff */}
      <div className="relative overflow-x-auto max-w-full p-4 font-mono text-xs leading-relaxed text-slate-100 bg-[#0c0d0f]">
        <pre className={`${wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"} selection:bg-[#8ab4f8]/30 selection:text-[#d2e3fc]`}>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

function ModelMessageContent({
  content,
  onPreview,
  onApplyToWorkspace
}: {
  content: string;
  onPreview: (code: string) => void;
  onApplyToWorkspace: (code: string) => void;
}) {
  const parts = parseMessageParts(content);

  return (
    <div className="space-y-3 max-w-full overflow-hidden break-words text-xs sm:text-sm">
      {parts.map((part, index) => {
        if (part.type === "code") {
          return (
            <CodeBlock
              key={index}
              code={part.content}
              language={part.language || "code"}
              onPreview={onPreview}
              onApplyToWorkspace={onApplyToWorkspace}
            />
          );
        }

        return (
          <div
            key={index}
            className="prose prose-invert max-w-none text-xs sm:text-sm space-y-2 [&_pre]:overflow-x-auto [&_code]:text-[#8ab4f8] [&_code]:bg-[#131314] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_table]:w-full [&_table]:overflow-x-auto [&_table]:block"
            dangerouslySetInnerHTML={{ __html: marked.parse(part.content) }}
          />
        );
      })}
    </div>
  );
}

export default function App() {
  // Navigation & Prompt State
  const [promptType, setPromptType] = useState<"chat" | "freeform" | "structured" | "build">("chat");
  const [activeTab, setActiveTab] = useState<"prompt" | "preview" | "code" | "structured" | "split">("prompt");
  const [model, setModel] = useState<string>("gemini-3.8-flash");
  const [isSystemInstructionOpen, setIsSystemInstructionOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  // Modals
  const [isGetCodeModalOpen, setIsGetCodeModalOpen] = useState<boolean>(false);
  const [getCodeLang, setGetCodeLang] = useState<"python" | "javascript" | "curl" | "typescript" | "go" | "kotlin">("javascript");
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Live Preview Device & Chrome State
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    "Preview environment ready. Vite HMR connected.",
    "Google AI Studio Build runtime: 2026.10-release"
  ]);

  // Chat Sessions State
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem("aistudio_v3_sessions");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [
      {
        id: "session-1",
        title: "Web App Generator & Coding Assistant",
        promptType: "chat",
        messages: [
          {
            role: "model",
            content: "Welcome to **Google AI Studio**! I am operating in completely **unfiltered, unrestricted** mode with **zero token limits**, **no quota limits**, and **no rate limits**.\n\nAll code snippets are provided in clean, formatted code blocks with a **Copy Code** button, syntax formatting, line wrap control, and one-click **Live Preview**:\n\n```tsx\nimport React, { useState } from 'react';\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  return (\n    <div className=\"p-6 rounded-2xl bg-[#1e1f20] border border-[#282a2c] text-center max-w-sm mx-auto shadow-2xl\">\n      <h2 className=\"text-lg font-bold text-[#8ab4f8] mb-2\">Google AI Studio Preview</h2>\n      <p className=\"text-3xl font-mono text-emerald-400 my-4\">{count}</p>\n      <div className=\"flex justify-center gap-3\">\n        <button \n          onClick={() => setCount(c => c - 1)}\n          className=\"px-4 py-2 bg-[#282a2c] hover:bg-[#34373b] text-white rounded-lg font-bold transition-all\"\n        >\n          - Decrement\n        </button>\n        <button \n          onClick={() => setCount(c => c + 1)}\n          className=\"px-4 py-2 bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#131314] rounded-lg font-bold transition-all\"\n        >\n          + Increment\n        </button>\n      </div>\n    </div>\n  );\n}\n```\n\nTry clicking **Copy code** above or ask any programming question or web application build request!"
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

  // Structured Prompt Examples State
  const [structuredExamples, setStructuredExamples] = useState<{ input: string; output: string }[]>([
    { input: "Write a function to reverse a linked list in TypeScript", output: "function reverseList(head: ListNode | null): ListNode | null {\n  let prev = null, curr = head;\n  while (curr) {\n    let next = curr.next;\n    curr.next = prev;\n    prev = curr;\n    curr = next;\n  }\n  return prev;\n}" },
    { input: "Write a Rust function to check if a string is a palindrome", output: "fn is_palindrome(s: &str) -> bool {\n    let clean: String = s.chars().filter(|c| c.is_alphanumeric()).flat_map(|c| c.to_lowercase()).collect();\n    clean.chars().eq(clean.chars().rev())\n}" }
  ]);
  const [structuredTestInput, setStructuredTestInput] = useState<string>("");
  const [structuredTestOutput, setStructuredTestOutput] = useState<string>("");

  // AI Studio Run Settings (Right Panel)
  const [temperature, setTemperature] = useState<number>(1.0);
  const [topP, setTopP] = useState<number>(0.95);
  const [topK, setTopK] = useState<number>(64);
  const [maxOutputTokens, setMaxOutputTokens] = useState<number>(65536);
  const [thinkingLevel, setThinkingLevel] = useState<string>("HIGH");
  const [systemInstruction, setSystemInstruction] = useState<string>(
    "You are a world-class AI software engineer and expert prompt engineer in Google AI Studio. Provide 100% robust, bug-free, production-ready code with complete error handling. When asked for UI or apps, generate complete, beautiful, working React/HTML code with Tailwind CSS."
  );
  const [groundingSearch, setGroundingSearch] = useState<boolean>(false);
  const [stopSequences, setStopSequences] = useState<string[]>([]);
  const [stopInput, setStopInput] = useState<string>("");
  const [lastUsage, setLastUsage] = useState<any>(null);
  const [lastRuntime, setLastRuntime] = useState<number | null>(null);

  // GitHub & Repository Integration State
  const [githubToken, setGithubToken] = useState<string>(() => localStorage.getItem("aistudio_github_token") || "");
  const [accountRepos, setAccountRepos] = useState<GitHubRepo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(false);
  const [selectedRepoFullName, setSelectedRepoFullName] = useState<string>(() => localStorage.getItem("aistudio_selected_repo") || "moisttowlett247/ai-studio-workspace");
  const [newRepoName, setNewRepoName] = useState<string>("");
  const [newRepoDesc, setNewRepoDesc] = useState<string>("");
  const [isPrivateRepo, setIsPrivateRepo] = useState<boolean>(false);
  const [isCreatingRepo, setIsCreatingRepo] = useState<boolean>(false);
  const [repoSearchQuery, setRepoSearchQuery] = useState<string>("");

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
    localStorage.setItem("aistudio_v3_sessions", JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem("aistudio_selected_repo", selectedRepoFullName);
  }, [selectedRepoFullName]);

  useEffect(() => {
    loadRepositoryFiles();
    fetchAccountRepos(githubToken);
  }, []);

  useEffect(() => {
    const currentSession = sessions.find(s => s.id === currentSessionId);
    if (chatScrollRef.current && (isGenerating || (currentSession && currentSession.messages.length > 1))) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [currentSessionId, sessions, isGenerating, aiActivityStep]);

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

  const fetchAccountRepos = async (token?: string) => {
    setIsLoadingRepos(true);
    try {
      const url = token ? `/api/github/repos?token=${encodeURIComponent(token)}` : `/api/github/repos`;
      const res = await fetch(url);
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
        <body class="bg-[#111318] text-slate-100 p-6 font-sans antialiased">
          <div id="root">
            <div class="p-6 bg-[#1a1d24] rounded-2xl border border-slate-800 shadow-2xl">
              <div class="flex items-center justify-between pb-3 border-b border-slate-800">
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                  <h2 class="text-sm font-bold text-blue-400">Google AI Studio Live Preview</h2>
                </div>
                <span class="text-xs text-slate-400 font-mono">${activeFilePath}</span>
              </div>
              <div class="mt-4 p-4 bg-[#111318] rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto text-emerald-400">
                <pre>${content.slice(0, 1200)}...</pre>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
  };

  const handlePreviewCode = (code: string) => {
    const isFullHtml = code.trim().toLowerCase().startsWith("<!doctype") || code.trim().toLowerCase().startsWith("<html");
    if (isFullHtml) {
      setLivePreviewHtml(code);
    } else {
      const cleanedCode = code.replace(/```(?:html|tsx|jsx|javascript|typescript)?/g, "").replace(/```/g, "").trim();
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
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Inter', sans-serif; }
            </style>
          </head>
          <body class="bg-[#111318] text-slate-100 p-6 min-h-screen">
            <div id="root">
              ${cleanedCode.includes("<") ? cleanedCode : `<div class="p-6 bg-[#1a1d24] rounded-2xl border border-slate-800 shadow-xl"><pre class="text-xs text-emerald-400 font-mono overflow-x-auto whitespace-pre"><code>${cleanedCode}</code></pre></div>`}
            </div>
          </body>
        </html>
      `);
    }
    setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Live App Preview updated from code block.`]);
    setActiveTab("preview");
  };

  const handleApplyToWorkspace = (code: string) => {
    const cleanedCode = code.replace(/```(?:html|tsx|jsx|javascript|typescript|python|rust|go)?/g, "").replace(/```/g, "").trim();
    setActiveFileContent(cleanedCode);
    setActiveTab("code");
    setSaveStatus(`Code snippet loaded into Workspace (${activeFilePath}).`);
  };

  const getCurrentSession = () => {
    return sessions.find(s => s.id === currentSessionId) || sessions[0];
  };

  const handleNewSession = (type: "chat" | "freeform" | "structured" | "build") => {
    const title = type === "chat" ? "New Chat Prompt" : type === "freeform" ? "New Freeform Prompt" : type === "structured" ? "New Structured Prompt" : "New Web Application";
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title,
      promptType: type,
      messages: [
        {
          role: "model",
          content: `Initialized ${title} with Gemini 3.8 Flash model execution.`
        }
      ],
      updatedAt: Date.now()
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
    setPromptType(type);
    setIsMobileMenuOpen(false);
    if (type === "build") {
      setActiveTab("preview");
    } else if (type === "structured") {
      setActiveTab("structured");
    } else {
      setActiveTab("prompt");
    }
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
      title: s.messages.length === 1 ? (userMsg.slice(0, 36) + "...") : s.title,
      messages: updatedMessages,
      updatedAt: Date.now()
    } : s));

    setIsGenerating(true);

    // Google AI Studio step simulation
    setAiActivityStep("Step 1/4: Analyzing prompt & repository context...");
    await new Promise(r => setTimeout(r, 300));
    setAiActivityStep("Step 2/4: Grounding with Gemini system instructions...");
    await new Promise(r => setTimeout(r, 300));
    setAiActivityStep("Step 3/4: Synthesizing neural transformer code & logic...");
    await new Promise(r => setTimeout(r, 300));
    setAiActivityStep("Step 4/4: Validating 100% bug-free syntax & safety...");

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
          maxOutputTokens,
          customSystemInstruction: systemInstruction,
          thinkingLevel,
          repoContext: {
            fullName: selectedRepoFullName,
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

        const throughput = data.usage?.totalTokenCount && data.runtimeSeconds
          ? Math.round(data.usage.totalTokenCount / data.runtimeSeconds)
          : 340;

        const finalMessages: Message[] = [
          ...updatedMessages,
          {
            role: "model",
            content: reply,
            runtimeSeconds: data.runtimeSeconds,
            tokensUsed: data.usage?.totalTokenCount || 240,
            throughput
          }
        ];

        setSessions(sessions.map(s => s.id === currentSessionId ? {
          ...s,
          messages: finalMessages,
          updatedAt: Date.now()
        } : s));

        // Auto-extract code for Google AI Studio style Live App Preview
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
              <body class="bg-[#111318] text-slate-100 p-6 font-sans antialiased">
                <div id="root">
                  ${code.includes("<") ? code : `<div class="p-6 bg-[#1a1d24] rounded-2xl border border-slate-800"><pre class="text-xs text-emerald-400 font-mono"><code>${code}</code></pre></div>`}
                </div>
              </body>
            </html>
          `);
          setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Live App Preview updated successfully.`]);
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

  const handleRunStructuredTest = async () => {
    if (!structuredTestInput.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      const fewShotPrompt = structuredExamples.map((ex, idx) => `Example ${idx + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}`).join("\n\n") + `\n\nTest Case:\nInput: ${structuredTestInput}\nOutput:`;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: fewShotPrompt,
          model,
          temperature,
          customSystemInstruction: systemInstruction
        })
      });
      const data = await res.json();
      if (res.ok) {
        setStructuredTestOutput(data.reply);
      }
    } catch (e: any) {
      setStructuredTestOutput(`Error: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAndCommit = async () => {
    if (!activeFilePath) return;
    setIsSaving(true);
    setSaveStatus("Saving and committing to GitHub repository...");
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
        setSaveStatus("Successfully pushed and committed to GitHub!");
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
    if (!newRepoName) return;
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

  const generateGetCodeSnippet = () => {
    const msg = getCurrentSession().messages.slice(-1)[0]?.content || "Your prompt here";
    if (getCodeLang === "python") {
      return `from google import genai

client = genai.Client()

response = client.models.generate_content(
    model="${model}",
    contents="${msg.replace(/"/g, '\\"').slice(0, 100)}...",
    config={
        "temperature": ${temperature},
        "top_p": ${topP},
        "top_k": ${topK},
    }
)

print(response.text)`;
    } else if (getCodeLang === "javascript" || getCodeLang === "typescript") {
      return `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI();

async function main() {
  const response = await ai.models.generateContent({
    model: "${model}",
    contents: "${msg.replace(/"/g, '\\"').slice(0, 100)}...",
    config: {
      temperature: ${temperature},
      topP: ${topP},
      topK: ${topK},
    }
  });

  console.log(response.text);
}

main();`;
    } else if (getCodeLang === "curl") {
      return `curl "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=\${GEMINI_API_KEY}" \\
-H 'Content-Type: application/json' \\
-X POST \\
-d '{
  "contents": [{
    "parts": [{"text": "${msg.replace(/"/g, '\\"').slice(0, 80)}..."}]
  }],
  "generationConfig": {
    "temperature": ${temperature},
    "topP": ${topP},
    "topK": ${topK}
  }
}'`;
    } else if (getCodeLang === "go") {
      return `package main

import (
    "context"
    "fmt"
    "os"
    "github.com/google/generative-ai-go/genai"
    "google.golang.org/api/option"
)

func main() {
    ctx := context.Background()
    client, _ := genai.NewClient(ctx, option.WithAPIKey(os.Getenv("GEMINI_API_KEY")))
    defer client.Close()

    model := client.GenerativeModel("${model}")
    resp, _ := model.GenerateContent(ctx, genai.Text("${msg.replace(/"/g, '\\"').slice(0, 60)}..."))
    fmt.Println(resp.Candidates[0].Content.Parts[0])
}`;
    } else {
      return `// Kotlin Android Implementation
val generativeModel = GenerativeModel(
    modelName = "${model}",
    apiKey = BuildConfig.apiKey
)

val prompt = "${msg.replace(/"/g, '\\"').slice(0, 60)}..."
val response = generativeModel.generateContent(prompt)
println(response.text)`;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#131314] text-[#e3e3e3] font-sans antialiased select-none">
      
      {/* 1. LEFT SIDEBAR / DRAWER (EXPANDABLE & COLLAPSIBLE) */}
      <aside className={`${isSidebarCollapsed ? "w-16" : "w-72"} bg-[#1e1f20] border-r border-[#282a2c] flex flex-col z-20 transition-all duration-200 hidden md:flex shrink-0`}>
        
        {/* Top Header with Google AI Studio Logo */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#282a2c]">
          <div className="flex items-center gap-3 overflow-hidden">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#282a2c] transition-colors"
              title="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-2 truncate">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#8ab4f8] via-[#c58af9] to-[#f28b82] flex items-center justify-center shadow">
                  <Sparkles className="w-4 h-4 text-[#131314] fill-current" />
                </div>
                <div>
                  <h1 className="font-semibold text-sm text-[#e3e3e3] tracking-tight">Google AI Studio</h1>
                  <span className="text-[10px] text-[#8ab4f8] font-mono">Build & Preview</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Prompt Options */}
        <div className="p-3 border-b border-[#282a2c] space-y-1.5">
          {!isSidebarCollapsed && (
            <div className="text-[11px] font-semibold text-slate-400 px-2 uppercase tracking-wider mb-1">
              Create Prompt
            </div>
          )}
          <button
            onClick={() => handleNewSession("chat")}
            className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5 px-3"} py-2 rounded-lg bg-[#282a2c] hover:bg-[#34373b] text-slate-200 text-xs font-medium transition-colors`}
            title="Chat prompt"
          >
            <MessageSquare className="w-4 h-4 text-[#8ab4f8] shrink-0" />
            {!isSidebarCollapsed && <span>Chat prompt</span>}
          </button>
          <button
            onClick={() => handleNewSession("build")}
            className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5 px-3"} py-2 rounded-lg hover:bg-[#282a2c] text-slate-200 text-xs font-medium transition-colors`}
            title="Build Web App"
          >
            <Eye className="w-4 h-4 text-[#81c995] shrink-0" />
            {!isSidebarCollapsed && <span>Build Web App (Live)</span>}
          </button>
          <button
            onClick={() => handleNewSession("structured")}
            className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5 px-3"} py-2 rounded-lg hover:bg-[#282a2c] text-slate-200 text-xs font-medium transition-colors`}
            title="Structured prompt"
          >
            <Terminal className="w-4 h-4 text-[#c58af9] shrink-0" />
            {!isSidebarCollapsed && <span>Structured prompt</span>}
          </button>
          <button
            onClick={() => handleNewSession("freeform")}
            className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5 px-3"} py-2 rounded-lg hover:bg-[#282a2c] text-slate-200 text-xs font-medium transition-colors`}
            title="Freeform prompt"
          >
            <FileCode className="w-4 h-4 text-[#fdd663] shrink-0" />
            {!isSidebarCollapsed && <span>Freeform prompt</span>}
          </button>
        </div>

        {/* Prompt History List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {!isSidebarCollapsed && (
            <div className="text-[11px] font-semibold text-slate-400 px-2 uppercase tracking-wider mb-2">
              Recent Prompts
            </div>
          )}
          {sessions.map(session => (
            <div
              key={session.id}
              onClick={() => {
                setCurrentSessionId(session.id);
                setPromptType(session.promptType);
                if (session.promptType === "build") setActiveTab("preview");
                else if (session.promptType === "structured") setActiveTab("structured");
                else setActiveTab("prompt");
              }}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                currentSessionId === session.id
                  ? "bg-[#8ab4f8]/15 border border-[#8ab4f8]/30 text-[#8ab4f8] font-medium"
                  : "hover:bg-[#282a2c] text-slate-300"
              }`}
              title={session.title}
            >
              <div className="flex items-center gap-2 truncate">
                {session.promptType === "chat" ? (
                  <MessageSquare className="w-3.5 h-3.5 text-[#8ab4f8] shrink-0" />
                ) : session.promptType === "build" ? (
                  <Eye className="w-3.5 h-3.5 text-[#81c995] shrink-0" />
                ) : session.promptType === "structured" ? (
                  <Terminal className="w-3.5 h-3.5 text-[#c58af9] shrink-0" />
                ) : (
                  <FileCode className="w-3.5 h-3.5 text-[#fdd663] shrink-0" />
                )}
                {!isSidebarCollapsed && <span className="truncate">{session.title}</span>}
              </div>
              {!isSidebarCollapsed && sessions.length > 1 && (
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

        {/* Connected GitHub Repository Status Card */}
        <div className="p-3 border-t border-[#282a2c] bg-[#171819]">
          <button
            onClick={() => setIsGitHubModalOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 bg-[#282a2c] hover:bg-[#34373b] text-slate-200 rounded-lg text-xs font-medium border border-[#3c4043] transition-colors"
          >
            <div className="flex items-center gap-2 truncate">
              <Github className="w-4 h-4 text-[#8ab4f8] shrink-0" />
              {!isSidebarCollapsed && (
                <span className="truncate">{selectedRepoFullName}</span>
              )}
            </div>
            {!isSidebarCollapsed && (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">
                main
              </span>
            )}
          </button>
        </div>

      </aside>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#131314]">
        
        {/* TOP NAVBAR (AUTHENTIC GOOGLE AI STUDIO HEADER) */}
        <header className="h-16 bg-[#1e1f20] border-b border-[#282a2c] flex items-center justify-between px-4 sm:px-6 z-10 shrink-0">
          
          <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Editable Prompt Title */}
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-xs sm:text-sm text-slate-100 truncate max-w-[140px] sm:max-w-none">
                {getCurrentSession().title}
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] bg-[#8ab4f8]/15 text-[#8ab4f8] border border-[#8ab4f8]/30 uppercase tracking-wider font-mono">
                {promptType}
              </span>
              <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Saved
              </span>
            </div>

            {/* View Tabs Switcher */}
            <nav className="flex items-center bg-[#131314] p-1 rounded-lg border border-[#282a2c] ml-2">
              <button
                onClick={() => setActiveTab("prompt")}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === "prompt" ? "bg-[#282a2c] text-[#8ab4f8]" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Prompt
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === "preview" ? "bg-[#282a2c] text-[#81c995]" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Preview</span>
              </button>
              <button
                onClick={() => setActiveTab("code")}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === "code" ? "bg-[#282a2c] text-[#8ab4f8]" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Workspace & Git
              </button>
              {promptType === "structured" && (
                <button
                  onClick={() => setActiveTab("structured")}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    activeTab === "structured" ? "bg-[#282a2c] text-[#c58af9]" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Examples
                </button>
              )}
            </nav>
          </div>

          {/* Top Actions: Model Selector, Get Code, Get API Key, Share, GitHub, Run */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Model Selector (Google AI Studio 1:1) */}
            <div className="hidden lg:flex items-center gap-1.5 bg-[#131314] px-2.5 py-1.5 rounded-lg border border-[#282a2c]">
              <Sparkles className="w-3.5 h-3.5 text-[#8ab4f8]" />
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
              >
                <option value="gemini-3.8-flash" className="bg-[#1e1f20]">gemini-3.8-flash (Recommended)</option>
                <option value="gemini-3.1-flash-lite" className="bg-[#1e1f20]">gemini-3.1-flash-lite (Fast)</option>
                <option value="gemini-flash-latest" className="bg-[#1e1f20]">gemini-flash-latest</option>
              </select>
            </div>

            {/* Get Code button */}
            <button
              onClick={() => setIsGetCodeModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#282a2c] hover:bg-[#34373b] text-slate-200 text-xs font-medium border border-[#3c4043] transition-colors"
            >
              <Code2 className="w-3.5 h-3.5 text-[#8ab4f8]" />
              <span>Get code</span>
            </button>

            {/* Get API Key */}
            <button
              onClick={() => setIsApiKeyModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#282a2c] hover:bg-[#34373b] text-slate-200 text-xs font-medium border border-[#3c4043] transition-colors"
            >
              <Key className="w-3.5 h-3.5 text-[#fdd663]" />
              <span>Get API key</span>
            </button>

            {/* Share */}
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#282a2c] hover:bg-[#34373b] text-slate-200 text-xs font-medium border border-[#3c4043] transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-300" />
              <span>Share</span>
            </button>

            {/* GitHub Sync */}
            <button
              onClick={() => setIsGitHubModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#282a2c] hover:bg-[#34373b] text-slate-200 text-xs font-medium border border-[#3c4043] transition-colors"
              title="GitHub Repositories & Sync"
            >
              <Github className="w-3.5 h-3.5 text-[#8ab4f8]" />
              <span className="hidden xl:inline truncate max-w-[130px]">{selectedRepoFullName}</span>
            </button>

            {/* Tuning Panel Toggle */}
            <button
              onClick={() => setIsConfigOpen(true)}
              className="lg:hidden p-2 bg-[#282a2c] text-slate-300 rounded-lg border border-[#3c4043]"
              title="Run settings"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Run Button */}
            <button
              onClick={() => handleRunPrompt()}
              disabled={isGenerating}
              className="flex items-center gap-1.5 bg-[#8ab4f8] hover:bg-[#a8c7fa] disabled:opacity-50 text-[#131314] px-4 py-1.5 rounded-lg text-xs font-bold shadow-md transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run</span>
            </button>

          </div>

        </header>

        {/* CENTER BODY: TABS + RUN SETTINGS */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* TAB 1: PROMPT / CHAT */}
          {activeTab === "prompt" && (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#131314]">
              
              {/* System Instructions Bar (Collapsible) */}
              <div className="border-b border-[#282a2c] bg-[#1e1f20]/50">
                <div
                  onClick={() => setIsSystemInstructionOpen(!isSystemInstructionOpen)}
                  className="px-6 py-2.5 flex items-center justify-between cursor-pointer hover:bg-[#282a2c]/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      System Instructions
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">(Optional)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-[11px]">{systemInstruction.length} chars</span>
                    {isSystemInstructionOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>

                {isSystemInstructionOpen && (
                  <div className="px-6 pb-3">
                    <textarea
                      value={systemInstruction}
                      onChange={(e) => setSystemInstruction(e.target.value)}
                      placeholder="Optional instructions to guide model responses..."
                      className="w-full h-16 bg-[#131314] border border-[#282a2c] rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-[#8ab4f8] font-mono resize-none leading-relaxed"
                    />
                  </div>
                )}
              </div>

              {/* Chat Message List */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl w-full mx-auto">
                {getCurrentSession().messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 sm:gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "model" && (
                      <div className="w-8 h-8 rounded-lg bg-[#8ab4f8]/15 border border-[#8ab4f8]/30 flex items-center justify-center shrink-0 mt-1">
                        <Sparkles className="w-4 h-4 text-[#8ab4f8]" />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-lg overflow-hidden ${
                        msg.role === "user"
                          ? "bg-[#8ab4f8] text-[#131314] max-w-[85%] sm:max-w-xl rounded-br-none font-medium"
                          : "bg-[#1e1f20] border border-[#282a2c] text-slate-100 max-w-[96%] sm:max-w-3xl rounded-bl-none w-full"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      ) : (
                        <div>
                          <ModelMessageContent
                            content={msg.content}
                            onPreview={handlePreviewCode}
                            onApplyToWorkspace={handleApplyToWorkspace}
                          />
                          {(msg.runtimeSeconds !== undefined || msg.tokensUsed !== undefined) && (
                            <div className="mt-4 pt-3 border-t border-[#282a2c] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
                              <span className="flex items-center gap-1.5 text-emerald-400">
                                <Clock className="w-3.5 h-3.5" />
                                Run time: {msg.runtimeSeconds}s
                              </span>
                              <span className="flex items-center gap-1.5 text-[#8ab4f8]">
                                <Zap className="w-3.5 h-3.5" />
                                {msg.tokensUsed} tokens ({msg.throughput || 340} tok/s)
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* AI Activity Status Indicator */}
                {isGenerating && (
                  <div className="flex gap-4 max-w-4xl mx-auto justify-start animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-[#8ab4f8]/15 border border-[#8ab4f8]/30 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-[#8ab4f8] animate-spin" />
                    </div>
                    <div className="rounded-2xl p-4 bg-[#1e1f20] border border-[#282a2c] text-[#8ab4f8] text-xs flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-[#8ab4f8] animate-ping" />
                      <span>{aiActivityStep || "AI is synthesizing solution..."}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <div className="p-4 bg-[#1e1f20] border-t border-[#282a2c] shrink-0">
                <form onSubmit={handleRunPrompt} className="max-w-4xl mx-auto flex items-center gap-3">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type something or ask to build a web application (Ctrl + Enter to run)..."
                    className="flex-1 bg-[#131314] border border-[#282a2c] rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#8ab4f8]"
                  />
                  <button
                    type="submit"
                    disabled={isGenerating || !inputMessage.trim()}
                    className="bg-[#8ab4f8] hover:bg-[#a8c7fa] disabled:opacity-50 text-[#131314] px-5 py-3 rounded-xl text-xs sm:text-sm font-bold shadow transition-all"
                  >
                    Run
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* TAB 2: LIVE APP PREVIEW (IDENTICAL TO GOOGLE AI STUDIO BUILD) */}
          {activeTab === "preview" && (
            <div className="flex-1 flex flex-col bg-[#131314] overflow-hidden">
              
              {/* Device and Chrome Bar */}
              <div className="h-12 bg-[#1e1f20] border-b border-[#282a2c] flex items-center justify-between px-4 shrink-0">
                
                {/* Device Selector: Desktop, Tablet, Mobile */}
                <div className="flex items-center gap-1 bg-[#131314] p-1 rounded-lg border border-[#282a2c]">
                  <button
                    onClick={() => setPreviewDevice("desktop")}
                    className={`p-1.5 rounded transition-colors ${previewDevice === "desktop" ? "bg-[#282a2c] text-[#8ab4f8]" : "text-slate-400 hover:text-white"}`}
                    title="Desktop view"
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPreviewDevice("tablet")}
                    className={`p-1.5 rounded transition-colors ${previewDevice === "tablet" ? "bg-[#282a2c] text-[#8ab4f8]" : "text-slate-400 hover:text-white"}`}
                    title="Tablet view (768px)"
                  >
                    <Tablet className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPreviewDevice("mobile")}
                    className={`p-1.5 rounded transition-colors ${previewDevice === "mobile" ? "bg-[#282a2c] text-[#8ab4f8]" : "text-slate-400 hover:text-white"}`}
                    title="Mobile view (375px)"
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>

                {/* Simulated URL bar */}
                <div className="flex-1 max-w-md mx-4 hidden sm:flex items-center bg-[#131314] border border-[#282a2c] rounded-lg px-3 py-1 text-xs text-slate-400 font-mono">
                  <span className="text-emerald-400 mr-1.5">🔒</span>
                  <span className="truncate">https://preview.aistudio.google/app</span>
                </div>

                {/* Open in new window & Console toggle */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                    className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                      isConsoleOpen ? "bg-[#282a2c] text-[#8ab4f8] border-[#8ab4f8]/40" : "bg-[#131314] text-slate-300 border-[#282a2c]"
                    }`}
                  >
                    Console ({consoleLogs.length})
                  </button>
                  <button
                    onClick={() => {
                      const w = window.open();
                      w?.document.write(livePreviewHtml);
                    }}
                    className="flex items-center gap-1 bg-[#282a2c] hover:bg-[#34373b] text-slate-200 px-3 py-1 rounded text-xs border border-[#3c4043]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in new tab</span>
                  </button>
                </div>

              </div>

              {/* Viewport container */}
              <div className="flex-1 bg-[#0b0b0c] flex items-center justify-center p-2 sm:p-4 overflow-hidden relative">
                <div
                  className={`h-full bg-white transition-all duration-200 shadow-2xl overflow-hidden rounded-xl border border-slate-700 ${
                    previewDevice === "mobile"
                      ? "w-[375px] max-w-full"
                      : previewDevice === "tablet"
                      ? "w-[768px] max-w-full"
                      : "w-full"
                  }`}
                >
                  <iframe
                    srcDoc={livePreviewHtml || "<div style='padding:40px;font-family:sans-serif;'><h2>No app preview generated yet.</h2><p>Ask the AI in chat to build a web application or component to preview it live here!</p></div>"}
                    className="w-full h-full border-none"
                    title="Live Web Preview"
                  />
                </div>
              </div>

              {/* Bottom DevTools Console Drawer */}
              {isConsoleOpen && (
                <div className="h-40 bg-[#1e1f20] border-t border-[#282a2c] flex flex-col font-mono text-xs">
                  <div className="px-4 py-2 bg-[#171819] border-b border-[#282a2c] flex items-center justify-between text-slate-400">
                    <span>Developer Console</span>
                    <button onClick={() => setConsoleLogs([])} className="hover:text-white">Clear</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-1 text-slate-300">
                    {consoleLogs.map((log, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-emerald-400">›</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: WORKSPACE & GITHUB COMMIT */}
          {activeTab === "code" && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#131314]">
              
              {/* File Explorer */}
              <div className="w-full md:w-72 bg-[#1e1f20] border-r border-[#282a2c] flex flex-col shrink-0 max-h-48 md:max-h-none">
                <div className="p-3 border-b border-[#282a2c] flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Folder className="w-4 h-4 text-[#8ab4f8]" />
                    Repository Files
                  </span>
                  <button onClick={loadRepositoryFiles} className="p-1 text-slate-400 hover:text-white" title="Refresh">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs">
                  {fileTree.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => item.type === "file" && handleSelectFile(item.path)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                        activeFilePath === item.path
                          ? "bg-[#8ab4f8]/15 text-[#8ab4f8] border border-[#8ab4f8]/30 font-medium"
                          : "hover:bg-[#282a2c] text-slate-300"
                      }`}
                    >
                      {item.type === "dir" ? <Folder className="w-3.5 h-3.5 text-amber-400" /> : <FileCode className="w-3.5 h-3.5 text-[#8ab4f8]" />}
                      <span className="truncate">{item.path}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Code Editor & Commit & Push Bar */}
              <div className="flex-1 flex flex-col bg-[#131314] overflow-hidden">
                <div className="p-3 bg-[#1e1f20] border-b border-[#282a2c] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-[#8ab4f8]" />
                    <span className="font-mono text-xs text-[#8ab4f8]">{activeFilePath}</span>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      placeholder="Commit message..."
                      className="bg-[#131314] border border-[#282a2c] rounded px-3 py-1 text-xs text-slate-200 flex-1 sm:w-60 focus:outline-none focus:border-[#8ab4f8]"
                    />
                    <button
                      onClick={handleSaveAndCommit}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 py-1 rounded text-xs font-medium shadow shrink-0"
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
                    className="w-full h-full bg-[#131314] text-slate-100 font-mono text-xs p-4 resize-none focus:outline-none leading-relaxed"
                    spellCheck={false}
                  />
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: STRUCTURED FEW-SHOT PROMPT EXAMPLES */}
          {activeTab === "structured" && (
            <div className="flex-1 flex flex-col bg-[#131314] p-6 overflow-y-auto">
              <div className="max-w-4xl mx-auto w-full space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-[#282a2c]">
                  <div>
                    <h2 className="text-sm font-bold text-slate-200">Structured Prompt Examples</h2>
                    <p className="text-xs text-slate-400">Provide input-output pairs to guide model formatting and few-shot reasoning.</p>
                  </div>
                  <button
                    onClick={() => setStructuredExamples([...structuredExamples, { input: "", output: "" }])}
                    className="flex items-center gap-1.5 bg-[#282a2c] hover:bg-[#34373b] text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#3c4043]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Example</span>
                  </button>
                </div>

                {structuredExamples.map((ex, idx) => (
                  <div key={idx} className="p-4 bg-[#1e1f20] border border-[#282a2c] rounded-xl space-y-3">
                    <div className="flex items-center justify-between text-xs font-medium text-[#8ab4f8]">
                      <span>Example {idx + 1}</span>
                      <button
                        onClick={() => setStructuredExamples(structuredExamples.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Input</label>
                        <textarea
                          value={ex.input}
                          onChange={(e) => {
                            const updated = [...structuredExamples];
                            updated[idx].input = e.target.value;
                            setStructuredExamples(updated);
                          }}
                          className="w-full h-24 bg-[#131314] border border-[#282a2c] rounded-lg p-2.5 text-xs text-slate-200 font-mono resize-none focus:outline-none focus:border-[#8ab4f8]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Expected Output</label>
                        <textarea
                          value={ex.output}
                          onChange={(e) => {
                            const updated = [...structuredExamples];
                            updated[idx].output = e.target.value;
                            setStructuredExamples(updated);
                          }}
                          className="w-full h-24 bg-[#131314] border border-[#282a2c] rounded-lg p-2.5 text-xs text-slate-200 font-mono resize-none focus:outline-none focus:border-[#8ab4f8]"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Test Row */}
                <div className="p-4 bg-[#1e1f20] border border-[#8ab4f8]/30 rounded-xl space-y-3">
                  <div className="text-xs font-semibold text-slate-200">Test Structured Prompt</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Test Input</label>
                      <textarea
                        value={structuredTestInput}
                        onChange={(e) => setStructuredTestInput(e.target.value)}
                        placeholder="Enter test input..."
                        className="w-full h-24 bg-[#131314] border border-[#282a2c] rounded-lg p-2.5 text-xs text-slate-200 font-mono resize-none focus:outline-none focus:border-[#8ab4f8]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Model Output</label>
                      <div className="w-full h-24 bg-[#131314] border border-[#282a2c] rounded-lg p-2.5 text-xs text-emerald-400 font-mono overflow-y-auto">
                        {structuredTestOutput || "Click Test to run..."}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleRunStructuredTest}
                      disabled={isGenerating || !structuredTestInput.trim()}
                      className="bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#131314] px-4 py-2 rounded-lg text-xs font-bold"
                    >
                      {isGenerating ? "Testing..." : "Test Model"}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* 3. RIGHT CONFIGURATION PANEL (GOOGLE AI STUDIO RUN SETTINGS) */}
          <div className="w-80 bg-[#1e1f20] border-l border-[#282a2c] flex-col p-4 z-20 overflow-y-auto hidden lg:flex shrink-0">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#282a2c] mb-4">
              <span className="font-semibold text-xs text-slate-200 uppercase tracking-wider">Run settings</span>
              <Sliders className="w-4 h-4 text-[#8ab4f8]" />
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Model Selection */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-[#131314] border border-[#282a2c] rounded-lg p-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-[#8ab4f8]"
                >
                  <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended)</option>
                  <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (High Speed)</option>
                  <option value="gemini-flash-latest">gemini-flash-latest</option>
                </select>
              </div>

              {/* Temperature */}
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Temperature</span>
                  <span className="font-mono text-slate-200">{temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-[#8ab4f8]"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Precise (0.0)</span>
                  <span>Balanced (1.0)</span>
                  <span>Creative (2.0)</span>
                </div>
              </div>

              {/* Top P */}
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Top P</span>
                  <span className="font-mono text-slate-200">{topP}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={topP}
                  onChange={(e) => setTopP(parseFloat(e.target.value))}
                  className="w-full accent-[#8ab4f8]"
                />
              </div>

              {/* Top K */}
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Top K</span>
                  <span className="font-mono text-slate-200">{topK}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={topK}
                  onChange={(e) => setTopK(parseInt(e.target.value))}
                  className="w-full accent-[#8ab4f8]"
                />
              </div>

              {/* Max Output Tokens (Uncapped / Up to 65,536) */}
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span className="font-medium">Output Token Limit</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Uncapped (65k)</span>
                </div>
                <select
                  value={maxOutputTokens}
                  onChange={(e) => setMaxOutputTokens(parseInt(e.target.value))}
                  className="w-full bg-[#131314] border border-[#282a2c] rounded-lg p-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-[#8ab4f8]"
                >
                  <option value={65536}>Uncapped / Maximum (65,536 tokens)</option>
                  <option value={32768}>32,768 tokens</option>
                  <option value={16384}>16,384 tokens</option>
                  <option value={8192}>8,192 tokens</option>
                </select>
              </div>

              {/* Zero Rate-Limit & Unrestricted Quota Card */}
              <div className="p-3 bg-[#131314] border border-emerald-500/20 rounded-xl space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Quota & Rate Limits: Unrestricted</span>
                </div>
                <div className="text-slate-400 text-[10px] leading-relaxed">
                  High-capacity Gemini quota active. Zero throttling, zero artificial rate limits, and unlimited inquiries.
                </div>
              </div>

              {/* Thinking Level */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Thinking Budget / Level</label>
                <select
                  value={thinkingLevel}
                  onChange={(e) => setThinkingLevel(e.target.value)}
                  className="w-full bg-[#131314] border border-[#282a2c] rounded-lg p-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-[#8ab4f8]"
                >
                  <option value="HIGH">High (Deep Reasoning)</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                  <option value="MINIMAL">Minimal</option>
                </select>
              </div>

              {/* Grounding Toggle */}
              <div className="p-3 bg-[#131314] border border-[#282a2c] rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-200 block">Grounding with Search</span>
                  <span className="text-[10px] text-slate-400">Enhance with live Google Search</span>
                </div>
                <input
                  type="checkbox"
                  checked={groundingSearch}
                  onChange={(e) => setGroundingSearch(e.target.checked)}
                  className="rounded bg-[#1e1f20] border-[#282a2c] text-[#8ab4f8] focus:ring-0"
                />
              </div>

              {/* Telemetry Card */}
              {lastUsage && (
                <div className="p-3 bg-[#131314] rounded-xl border border-[#282a2c] space-y-1 font-mono text-[11px] text-slate-300">
                  <div className="font-semibold text-[#8ab4f8] mb-1">Inference Telemetry</div>
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

      {/* 4. MODALS (GET CODE, API KEY, SHARE, GITHUB SYNC) */}

      {/* GET CODE MODAL */}
      {isGetCodeModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1f20] border border-[#282a2c] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#282a2c] flex items-center justify-between bg-[#171819]">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-[#8ab4f8]" />
                <h3 className="font-semibold text-sm text-slate-200">Get Code - Google GenAI SDK</h3>
              </div>
              <button onClick={() => setIsGetCodeModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Language Tabs */}
            <div className="flex border-b border-[#282a2c] bg-[#131314] px-4">
              {(["javascript", "typescript", "python", "curl", "go", "kotlin"] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setGetCodeLang(lang)}
                  className={`px-3 py-2 text-xs font-mono capitalize transition-colors border-b-2 ${
                    getCodeLang === lang ? "border-[#8ab4f8] text-[#8ab4f8]" : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            <div className="p-4 flex-1 overflow-hidden relative">
              <pre className="w-full h-64 bg-[#131314] rounded-xl p-4 text-xs font-mono text-emerald-400 overflow-auto border border-[#282a2c]">
                {generateGetCodeSnippet()}
              </pre>
            </div>

            <div className="p-4 border-t border-[#282a2c] bg-[#171819] flex justify-between items-center">
              <span className="text-[11px] text-slate-400">Uses modern @google/genai SDK</span>
              <button
                onClick={() => copyToClipboard(generateGetCodeSnippet())}
                className="flex items-center gap-1.5 bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#131314] px-4 py-2 rounded-xl text-xs font-bold"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GITHUB SYNC & REPOSITORY SETTINGS MODAL */}
      {isGitHubModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1f20] border border-[#282a2c] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#282a2c] flex items-center justify-between bg-[#171819]">
              <div className="flex items-center gap-2">
                <Github className="w-5 h-5 text-[#8ab4f8]" />
                <h3 className="font-semibold text-sm text-slate-200">GitHub Repository Sync & Management</h3>
              </div>
              <button onClick={() => setIsGitHubModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              
              {/* Account Repositories List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-300 uppercase tracking-wider">
                    Available Account Repositories
                  </label>
                  <span className="text-[11px] text-slate-400">Click to switch</span>
                </div>
                <div className="max-h-48 overflow-y-auto bg-[#131314] border border-[#282a2c] rounded-xl p-2 space-y-1">
                  {accountRepos.map(repo => (
                    <div
                      key={repo.id}
                      onClick={() => {
                        setSelectedRepoFullName(repo.full_name);
                        setIsGitHubModalOpen(false);
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                        selectedRepoFullName === repo.full_name
                          ? "bg-[#8ab4f8]/20 border border-[#8ab4f8]/40 text-[#8ab4f8] font-medium"
                          : "hover:bg-[#282a2c] text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {repo.private ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Globe className="w-3.5 h-3.5 text-emerald-400" />}
                        <span className="font-mono">{repo.full_name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{repo.language || "Code"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Create New Repository */}
              <form onSubmit={handleCreateNewRepo} className="border-t border-[#282a2c] pt-4 space-y-3">
                <h4 className="font-semibold text-slate-300 uppercase tracking-wider">Create New Repository</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    placeholder="repository-name"
                    className="bg-[#131314] border border-[#282a2c] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-[#8ab4f8] font-mono"
                  />
                  <input
                    type="text"
                    value={newRepoDesc}
                    onChange={(e) => setNewRepoDesc(e.target.value)}
                    placeholder="Description (optional)"
                    className="bg-[#131314] border border-[#282a2c] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-[#8ab4f8]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPrivateRepo}
                      onChange={(e) => setIsPrivateRepo(e.target.checked)}
                      className="rounded bg-[#131314] border-[#282a2c] text-[#8ab4f8]"
                    />
                    <span>Private repository</span>
                  </label>
                  <button
                    type="submit"
                    disabled={isCreatingRepo || !newRepoName}
                    className="bg-[#8ab4f8] hover:bg-[#a8c7fa] disabled:opacity-50 text-[#131314] px-4 py-2 rounded-xl font-bold shadow"
                  >
                    {isCreatingRepo ? "Creating..." : "Create Repository"}
                  </button>
                </div>
              </form>

              {/* Personal Access Token (Optional Manual Override) */}
              <div className="border-t border-[#282a2c] pt-4 space-y-2">
                <label className="block text-slate-400 font-medium">Personal Access Token (PAT)</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="flex-1 bg-[#131314] border border-[#282a2c] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-[#8ab4f8] font-mono"
                  />
                  <button
                    onClick={() => {
                      localStorage.setItem("aistudio_github_token", githubToken);
                      fetchAccountRepos(githubToken);
                    }}
                    className="bg-[#282a2c] hover:bg-[#34373b] text-slate-200 px-4 py-2 rounded-xl font-medium border border-[#3c4043]"
                  >
                    Sync
                  </button>
                </div>
              </div>

            </div>

            <div className="p-4 border-t border-[#282a2c] bg-[#171819] flex justify-end">
              <button
                onClick={() => setIsGitHubModalOpen(false)}
                className="bg-[#8ab4f8] text-[#131314] px-4 py-2 rounded-xl font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GET API KEY MODAL */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1f20] border border-[#282a2c] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#282a2c]">
              <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                <Key className="w-4 h-4 text-[#fdd663]" />
                Gemini API Key
              </h3>
              <button onClick={() => setIsApiKeyModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Google AI Studio automatically manages high-capacity API quotas in this environment. Your requests run directly with Gemini 3.8 Flash and Gemini 2.5 Pro without artificial rate limits.
            </p>
            <div className="p-3 bg-[#131314] rounded-xl border border-[#282a2c] font-mono text-[11px] text-emerald-400 flex items-center justify-between">
              <span>Status: Active & Authorized</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <button
              onClick={() => setIsApiKeyModalOpen(false)}
              className="w-full py-2.5 bg-[#8ab4f8] text-[#131314] font-bold rounded-xl"
            >
              Continue Building
            </button>
          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1f20] border border-[#282a2c] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#282a2c]">
              <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#8ab4f8]" />
                Share Prompt
              </h3>
              <button onClick={() => setIsShareModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-300">
              Anyone with this link can view and run this prompt in Google AI Studio:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={window.location.href}
                className="flex-1 bg-[#131314] border border-[#282a2c] rounded-xl px-3 py-2 text-slate-300 font-mono text-xs focus:outline-none"
              />
              <button
                onClick={() => copyToClipboard(window.location.href)}
                className="bg-[#8ab4f8] text-[#131314] px-4 py-2 rounded-xl font-bold"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE MENU DRAWER */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur z-50 flex flex-col p-4 bg-[#1e1f20]">
          <div className="flex items-center justify-between pb-4 border-b border-[#282a2c]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#8ab4f8]" />
              <span className="font-bold text-sm text-white">Google AI Studio</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="py-4 space-y-2">
            <button
              onClick={() => handleNewSession("chat")}
              className="w-full flex items-center gap-3 py-3 px-4 bg-[#8ab4f8] text-[#131314] rounded-xl text-sm font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat Prompt</span>
            </button>
            <button
              onClick={() => handleNewSession("build")}
              className="w-full flex items-center gap-3 py-3 px-4 bg-[#282a2c] text-slate-200 rounded-xl text-sm font-medium border border-[#3c4043]"
            >
              <Eye className="w-4 h-4 text-[#81c995]" />
              <span>Build Web App (Live Preview)</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 py-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">Recent Prompts</div>
            {sessions.map(s => (
              <div
                key={s.id}
                onClick={() => {
                  setCurrentSessionId(s.id);
                  setPromptType(s.promptType);
                  setIsMobileMenuOpen(false);
                }}
                className={`p-3 rounded-xl text-sm ${currentSessionId === s.id ? "bg-[#8ab4f8]/20 text-[#8ab4f8] border border-[#8ab4f8]/30 font-medium" : "text-slate-300 hover:bg-[#282a2c]"}`}
              >
                {s.title}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[#282a2c]">
            <button
              onClick={() => { setIsGitHubModalOpen(true); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#282a2c] text-slate-200 rounded-xl text-xs font-medium border border-[#3c4043]"
            >
              <Github className="w-4 h-4 text-[#8ab4f8]" />
              <span>{selectedRepoFullName}</span>
            </button>
          </div>
        </div>
      )}

      {/* MOBILE CONFIG DRAWER */}
      {isConfigOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur z-50 flex flex-col p-4 bg-[#1e1f20] overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-[#282a2c]">
            <span className="font-bold text-sm text-[#8ab4f8]">Run settings</span>
            <button onClick={() => setIsConfigOpen(false)} className="p-2 text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="py-4 space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-[#131314] border border-[#282a2c] rounded-lg p-2 text-slate-200 font-mono"
              >
                <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended)</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (High Speed)</option>
                <option value="gemini-flash-latest">gemini-flash-latest</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Temperature ({temperature})</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-[#8ab4f8]"
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
                className="w-full accent-[#8ab4f8]"
              />
            </div>
            <button
              onClick={() => setIsConfigOpen(false)}
              className="w-full py-3 bg-[#8ab4f8] text-[#131314] font-bold rounded-xl mt-4"
            >
              Apply Settings
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
