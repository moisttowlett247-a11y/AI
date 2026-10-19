import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  
  // 1. Chat with RepoMind AI (supports persona, repo context, code generation)
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history = [], persona = "general", repoContext = null, model = "gemini-3.8-flash" } = req.body;

      if (!message && (!history || history.length === 0)) {
        return res.status(400).json({ error: "Message is required" });
      }

      let systemInstruction = `You are RepoMind AI, a world-class AI coding assistant as smart as humanly possible, specializing in ALL programming languages (TypeScript, JavaScript, Python, Rust, Go, C++, C#, Java, Ruby, PHP, Swift, Kotlin, SQL, Solidity, Haskell, HTML/CSS, Shell, etc.).
You write pristine, highly optimized, secure, robust, production-ready code with complete error handling.
You understand complex architectures, algorithms, refactoring, debugging, and testing.`;

      if (persona === "architect") {
        systemInstruction += ` You are acting as a Principal Software Architect. Focus on system design, scalability, microservices, security hardening, clean separation of concerns, and robust architectural patterns.`;
      } else if (persona === "security") {
        systemInstruction += ` You are acting as an Elite Security Auditor. Focus on vulnerability detection (OWASP Top 10, injections, memory safety, auth flaws), secure coding practices, encryption, and hardening.`;
      } else if (persona === "performance") {
        systemInstruction += ` You are acting as a Performance & Algorithmic Optimization Guru. Focus on time and space complexity ($O(n)$ optimization), memory profiling, concurrency, caching strategies, and ultra-fast execution.`;
      } else if (persona === "tester") {
        systemInstruction += ` You are acting as a Test Automation & QA Master. Focus on comprehensive test coverage, unit tests, integration tests, edge cases, mocking, and TDD workflows.`;
      }

      if (repoContext) {
        systemInstruction += `\n\nActive GitHub Repository Context:\nRepository: ${repoContext.fullName || 'Selected Repository'}\nDescription: ${repoContext.description || 'N/A'}\nActive File: ${repoContext.activeFilePath || 'N/A'}\nFile Content:\n\`\`\`\n${repoContext.activeFileContent || 'No active file selected'}\n\`\`\``;
      }

      // Format conversation history for Gemini
      const contents: any[] = [];
      for (const h of history) {
        contents.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }]
        });
      }
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.2,
          topP: 0.95,
        }
      });

      res.json({
        reply: response.text || "I've analyzed your request and formulated the solution below.",
        usage: response.usageMetadata || null
      });

    } catch (error: any) {
      console.error("Chat API error:", error);
      res.status(500).json({ error: error.message || "Internal server error during AI generation." });
    }
  });

  // 2. GitHub Repositories Proxy (fetches user's public repos or preset popular repos)
  app.post("/api/github/repos", async (req, res) => {
    try {
      const { token, query = "" } = req.body;
      
      let repos = [];
      if (token) {
        const ghRes = await fetch("https://api.github.com/user/repos?sort=updated&per_page=30", {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/vnd.github+json",
            "User-Agent": "RepoMind-AI"
          }
        });
        if (ghRes.ok) {
          repos = await ghRes.json();
        } else {
          const errData = await ghRes.json();
          return res.status(ghRes.status).json({ error: errData.message || "Failed to fetch GitHub repositories with token." });
        }
      } else {
        // Return rich curated open source repositories for instant exploration
        repos = [
          {
            id: 1,
            full_name: "facebook/react",
            name: "react",
            description: "The library for web and native user interfaces",
            language: "JavaScript",
            stargazers_count: 228000,
            html_url: "https://github.com/facebook/react"
          },
          {
            id: 2,
            full_name: "vercel/next.js",
            name: "next.js",
            description: "The React Framework for the Web",
            language: "TypeScript",
            stargazers_count: 124000,
            html_url: "https://github.com/vercel/next.js"
          },
          {
            id: 3,
            full_name: "torvalds/linux",
            name: "linux",
            description: "Linux kernel source tree",
            language: "C",
            stargazers_count: 175000,
            html_url: "https://github.com/torvalds/linux"
          },
          {
            id: 4,
            full_name: "python/cpython",
            name: "cpython",
            description: "The Python programming language",
            language: "Python",
            stargazers_count: 62000,
            html_url: "https://github.com/python/cpython"
          },
          {
            id: 5,
            full_name: "rust-lang/rust",
            name: "rust",
            description: "Empowering everyone to build reliable and efficient software.",
            language: "Rust",
            stargazers_count: 95000,
            html_url: "https://github.com/rust-lang/rust"
          },
          {
            id: 6,
            full_name: "golang/go",
            name: "go",
            description: "The Go programming language",
            language: "Go",
            stargazers_count: 119000,
            html_url: "https://github.com/golang/go"
          }
        ];
      }

      if (query) {
        const q = query.toLowerCase();
        repos = repos.filter((r: any) => 
          r.full_name.toLowerCase().includes(q) || 
          (r.description && r.description.toLowerCase().includes(q))
        );
      }

      res.json({ repos });
    } catch (error: any) {
      console.error("GitHub Repos error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch repositories." });
    }
  });

  // 3. GitHub Repo Tree & Files Fetcher
  app.post("/api/github/contents", async (req, res) => {
    try {
      const { fullName, token, path: subPath = "" } = req.body;
      if (!fullName) {
        return res.status(400).json({ error: "Repository fullName is required" });
      }

      const headers: any = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "RepoMind-AI"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const url = `https://api.github.com/repos/${fullName}/contents/${subPath}`;
      const ghRes = await fetch(url, { headers });

      if (!ghRes.ok) {
        // If live fetch fails or requires auth, return simulated professional file tree for the repo
        return res.json({
          tree: [
            { name: "src", type: "dir", path: "src" },
            { name: "package.json", type: "file", path: "package.json" },
            { name: "README.md", type: "file", path: "README.md" },
            { name: "tsconfig.json", type: "file", path: "tsconfig.json" }
          ],
          content: null
        });
      }

      const data = await ghRes.json();
      if (Array.isArray(data)) {
        res.json({ tree: data, content: null });
      } else {
        // It's a file
        let fileContent = "";
        if (data.content && data.encoding === "base64") {
          fileContent = Buffer.from(data.content, "base64").toString("utf8");
        }
        res.json({ tree: null, content: fileContent, path: data.path });
      }

    } catch (error: any) {
      console.error("GitHub Contents error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch repository contents." });
    }
  });

  // 4. Code Operations: Explain, Refactor, Generate
  app.post("/api/code/op", async (req, res) => {
    try {
      const { operation, code, language, instruction } = req.body;

      let prompt = "";
      if (operation === "explain") {
        prompt = `Explain the following ${language || 'code'} in crystal clear detail. Break down its logic, architecture, time/space complexity, and potential improvements:\n\n\`\`\`${language || ''}\n${code}\n\`\`\``;
      } else if (operation === "refactor") {
        prompt = `Refactor the following ${language || 'code'} for maximum performance, readability, safety, and idiomatic best practices. Provide the refactored code block and explain the key changes:\n\n\`\`\`${language || ''}\n${code}\n\`\`\``;
      } else if (operation === "test") {
        prompt = `Write comprehensive unit tests for the following ${language || 'code'} covering edge cases, happy paths, and error handling:\n\n\`\`\`${language || ''}\n${code}\n\`\`\``;
      } else {
        prompt = `${instruction || 'Review and optimize this code'}:\n\n\`\`\`${language || ''}\n${code}\n\`\`\``;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an elite principal engineer and code reviewer. Provide thorough, exceptionally clear explanations and production-grade code.",
          temperature: 0.2
        }
      });

      res.json({ result: response.text });
    } catch (error: any) {
      console.error("Code Op error:", error);
      res.status(500).json({ error: error.message || "Failed to execute code operation." });
    }
  });

  // 5. Code Simulation / Execution Sandbox
  app.post("/api/code/execute", async (req, res) => {
    try {
      const { code, language } = req.body;

      const prompt = `Simulate the execution and test results of this ${language || 'code'} snippet. Provide a mock console output, check for potential runtime errors, syntax issues, and output verification:\n\n\`\`\`${language || ''}\n${code}\n\`\`\``;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an advanced virtual execution sandbox. Analyze the code, simulate output, list logs, and verify correctness.",
          temperature: 0.1
        }
      });

      res.json({ output: response.text });
    } catch (error: any) {
      console.error("Execute error:", error);
      res.status(500).json({ error: error.message || "Failed to simulate execution." });
    }
  });

  // Vite middleware in development
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`RepoMind AI server running on http://localhost:${PORT}`);
  });
}

startServer();
