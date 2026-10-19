import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
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
  
  // 1. Chat with RepoMind AI (with precise AI Studio settings)
  app.post("/api/chat", async (req, res) => {
    try {
      const {
        message,
        history = [],
        persona = "general",
        repoContext = null,
        model = "gemini-3.8-flash",
        temperature = 0.1,
        topP = 0.95,
        topK = 64,
        customSystemInstruction = "",
        thinkingLevel = "HIGH"
      } = req.body;

      if (!message && (!history || history.length === 0)) {
        return res.status(400).json({ error: "Message is required" });
      }

      const startTime = Date.now();

      let baseInstruction = customSystemInstruction || `You are RepoMind AI, the world's most advanced AI software engineering expert, operating at maximum possible intelligence. You specialize in ALL programming languages (TypeScript, JavaScript, Python, Rust, Go, C++, C#, Java, Ruby, PHP, Swift, Kotlin, SQL, Solidity, Haskell, HTML/CSS, Shell, etc.).

CRITICAL QUALITY GUARANTEE:
1. Every code snippet you write MUST BE 100% syntactically and logically correct, robust, secure, and production-ready with zero bugs, zero syntax errors, and zero unhandled edge cases.
2. Never use placeholders like "// TODO", "/* implement here */", or ellipses (...). Write fully complete, functioning implementations.
3. Always include proper type definitions, robust error handling (try/catch, null/undefined checks, input validation), and necessary imports.
4. Reason step-by-step through complex algorithms, memory safety, concurrency, and architecture before emitting the final code.`;

      if (persona === "architect") {
        baseInstruction += ` You are acting as a Principal Software Architect. Focus on enterprise-grade system design, scalability, microservices, security hardening, clean separation of concerns, and robust architectural patterns.`;
      } else if (persona === "security") {
        baseInstruction += ` You are acting as an Elite Security Auditor. Focus on vulnerability detection (OWASP Top 10, injections, memory safety, race conditions, auth flaws), secure coding practices, encryption, and zero-trust verification.`;
      } else if (persona === "performance") {
        baseInstruction += ` You are acting as a Performance & Algorithmic Optimization Guru. Focus on optimal time and space complexity, memory profiling, lock-free concurrency, caching strategies, and ultra-fast execution.`;
      } else if (persona === "tester") {
        baseInstruction += ` You are acting as a Test Automation & QA Master. Focus on comprehensive test coverage, unit tests, integration tests, boundary conditions, mocking, and bulletproof TDD workflows.`;
      }

      if (repoContext) {
        baseInstruction += `\n\nConnected GitHub Repository Context:\nRepository: ${repoContext.fullName || 'Connected Project'}\nDescription: ${repoContext.description || 'AI Studio Connected Repository'}\nActive File: ${repoContext.activeFilePath || 'N/A'}\nFile Content:\n\`\`\`\n${repoContext.activeFileContent || 'No active file selected'}\n\`\`\``;
      }

      // Sanitize and format multi-turn history for Gemini API
      // Rules:
      // 1. Must start with role 'user'
      // 2. Roles must strictly alternate: user -> model -> user -> model
      // 3. Last turn must be 'user'
      const rawTurns: { role: 'user' | 'model'; text: string }[] = [];
      for (const h of history) {
        if (h && typeof h.content === 'string' && h.content.trim()) {
          rawTurns.push({
            role: h.role === 'user' ? 'user' : 'model',
            text: h.content.trim()
          });
        }
      }
      if (message && typeof message === 'string' && message.trim()) {
        rawTurns.push({
          role: 'user',
          text: message.trim()
        });
      }

      // Drop any leading model messages
      while (rawTurns.length > 0 && rawTurns[0].role === 'model') {
        rawTurns.shift();
      }

      // If no user message was in history, add the incoming message
      if (rawTurns.length === 0 && message) {
        rawTurns.push({ role: 'user', text: message });
      }

      // Merge consecutive turns with the same role to maintain strict alternation
      const alternatedTurns: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
      for (const turn of rawTurns) {
        if (alternatedTurns.length > 0 && alternatedTurns[alternatedTurns.length - 1].role === turn.role) {
          alternatedTurns[alternatedTurns.length - 1].parts[0].text += `\n\n${turn.text}`;
        } else {
          alternatedTurns.push({
            role: turn.role,
            parts: [{ text: turn.text }]
          });
        }
      }

      // Ensure the very last turn is 'user'
      if (alternatedTurns.length === 0 || alternatedTurns[alternatedTurns.length - 1].role !== 'user') {
        alternatedTurns.push({
          role: 'user',
          parts: [{ text: message || 'Continue' }]
        });
      }

      let tLevel = ThinkingLevel.HIGH;
      if (thinkingLevel === "MEDIUM") tLevel = ThinkingLevel.MEDIUM;
      else if (thinkingLevel === "LOW") tLevel = ThinkingLevel.LOW;
      else if (thinkingLevel === "MINIMAL") tLevel = ThinkingLevel.MINIMAL;

      let activeModel = model || "gemini-3.8-flash";
      if (activeModel.includes("gemini-2.5-flash")) {
        activeModel = "gemini-3.8-flash";
      }

      let response;
      try {
        response = await ai.models.generateContent({
          model: activeModel,
          contents: alternatedTurns,
          config: {
            systemInstruction: baseInstruction,
            temperature: Number(temperature),
            topP: Number(topP),
            topK: Number(topK),
            thinkingConfig: { thinkingLevel: tLevel }
          }
        });
      } catch (genError: any) {
        console.warn(`Attempt with ${activeModel} failed, retrying with gemini-3.8-flash:`, genError.message);
        response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: alternatedTurns,
          config: {
            systemInstruction: baseInstruction,
            temperature: Number(temperature),
            topP: Number(topP),
            topK: Number(topK),
            thinkingConfig: { thinkingLevel: tLevel }
          }
        });
      }

      const runtimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

      res.json({
        reply: response.text || "I've analyzed your request and formulated the solution below.",
        usage: response.usageMetadata || null,
        runtimeSeconds: Number(runtimeSeconds)
      });

    } catch (error: any) {
      console.error("Chat API error:", error);
      res.status(500).json({ error: error.message || "Internal server error during AI generation." });
    }
  });

  // 2. Load Connected Repository Files (Local workspace inspection)
  app.get("/api/repository/files", async (req, res) => {
    try {
      const rootDir = __dirname;
      const ignoreDirs = ['node_modules', '.git', 'dist', '.aistudio'];
      
      const filesList: any[] = [];
      
      function walkDir(currentPath: string, relativeToRoot: string = "") {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        for (const entry of entries) {
          if (ignoreDirs.includes(entry.name)) continue;
          const relPath = relativeToRoot ? `${relativeToRoot}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            filesList.push({ name: entry.name, type: "dir", path: relPath });
            walkDir(path.join(currentPath, entry.name), relPath);
          } else {
            filesList.push({ name: entry.name, type: "file", path: relPath });
          }
        }
      }

      walkDir(rootDir);

      let defaultContent = "";
      const defaultPath = "src/App.tsx";
      try {
        defaultContent = fs.readFileSync(path.join(rootDir, defaultPath), "utf8");
      } catch {
        defaultContent = "// Connected repository ready";
      }

      res.json({
        repositoryName: "Connected GitHub Repository",
        description: "Active repository synchronized directly with RepoMind AI",
        tree: filesList,
        defaultFile: { path: defaultPath, content: defaultContent }
      });
    } catch (error: any) {
      console.error("Repository files error:", error);
      res.status(500).json({ error: error.message || "Failed to load connected repository files." });
    }
  });

  // 3. Read specific file content
  app.post("/api/repository/file-content", async (req, res) => {
    try {
      const { filePath } = req.body;
      if (!filePath) {
        return res.status(400).json({ error: "filePath is required" });
      }
      const safePath = path.resolve(__dirname, filePath);
      if (!safePath.startsWith(__dirname)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const content = fs.readFileSync(safePath, "utf8");
      res.json({ path: filePath, content });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to read file." });
    }
  });

  // 4. Save file locally and push/commit to GitHub
  app.post("/api/repository/save-file", async (req, res) => {
    try {
      const { filePath, content, token, repoFullName, commitMessage } = req.body;
      if (!filePath || content === undefined) {
        return res.status(400).json({ error: "filePath and content are required" });
      }

      // Save locally
      const safePath = path.resolve(__dirname, filePath);
      if (!safePath.startsWith(__dirname)) {
        return res.status(403).json({ error: "Access denied" });
      }
      // Ensure directory exists
      fs.mkdirSync(path.dirname(safePath), { recursive: true });
      fs.writeFileSync(safePath, content, "utf8");

      // If GitHub token and repoFullName are provided, push commit to GitHub
      if (token && repoFullName) {
        const getFileUrl = `https://api.github.com/repos/${repoFullName}/contents/${filePath}`;
        const getRes = await fetch(getFileUrl, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/vnd.github+json",
            "User-Agent": "RepoMind-AI"
          }
        });

        let sha = undefined;
        if (getRes.ok) {
          const fileData = await getRes.json();
          sha = fileData.sha;
        }

        const putRes = await fetch(getFileUrl, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/vnd.github+json",
            "User-Agent": "RepoMind-AI",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: commitMessage || `Update ${filePath} via RepoMind AI Studio`,
            content: Buffer.from(content).toString("base64"),
            sha
          })
        });

        if (!putRes.ok) {
          const errData = await putRes.json();
          return res.status(400).json({ error: `Saved locally, but failed to push to GitHub: ${errData.message}` });
        }
      }

      res.json({ success: true, message: "File saved and committed successfully." });
    } catch (error: any) {
      console.error("Save file error:", error);
      res.status(500).json({ error: error.message || "Failed to save file." });
    }
  });

  // 5. List GitHub Repositories for connected account
  app.get("/api/github/repos", async (req, res) => {
    try {
      const token = req.query.token as string || req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return res.status(400).json({ error: "GitHub token is required" });
      }

      const ghRes = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.github+json",
          "User-Agent": "RepoMind-AI"
        }
      });

      if (!ghRes.ok) {
        const errData = await ghRes.json();
        return res.status(ghRes.status).json({ error: errData.message || "Failed to list repositories from GitHub." });
      }

      const repos = await ghRes.json();
      res.json({ success: true, repos });
    } catch (error: any) {
      console.error("List repos error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch repositories." });
    }
  });

  // 6. Create new GitHub Repository
  app.post("/api/github/create-repo", async (req, res) => {
    try {
      const { token, name, description, isPrivate = false } = req.body;
      if (!token || !name) {
        return res.status(400).json({ error: "GitHub token and repository name are required" });
      }

      const ghRes = await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.github+json",
          "User-Agent": "RepoMind-AI",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          description: description || "Created via RepoMind AI Studio",
          private: isPrivate,
          auto_init: true
        })
      });

      if (!ghRes.ok) {
        const errData = await ghRes.json();
        return res.status(ghRes.status).json({ error: errData.message || "Failed to create GitHub repository." });
      }

      const newRepo = await ghRes.json();
      res.json({ success: true, repo: newRepo });
    } catch (error: any) {
      console.error("Create repo error:", error);
      res.status(500).json({ error: error.message || "Failed to create repository." });
    }
  });

  // 7. Code Operations
  app.post("/api/code/op", async (req, res) => {
    try {
      const { operation, code, language, instruction } = req.body;

      let prompt = "";
      if (operation === "explain") {
        prompt = `Explain the following ${language || 'code'} in crystal clear detail. Break down its logic, architecture, time/space complexity, and potential improvements:\n\n\`\`\`${language || ''}\n${code}\n\`\`\``;
      } else if (operation === "refactor") {
        prompt = `Refactor the following ${language || 'code'} for maximum performance, readability, safety, and idiomatic best practices. Ensure 100% bug-free, robust implementation without placeholders:\n\n\`\`\`${language || ''}\n${code}\n\`\`\``;
      } else if (operation === "test") {
        prompt = `Write comprehensive unit tests for the following ${language || 'code'} covering edge cases, happy paths, and error handling:\n\n\`\`\`${language || ''}\n${code}\n\`\`\``;
      } else {
        prompt = `${instruction || 'Review and optimize this code'}:\n\n\`\`\`${language || ''}\n${code}\n\`\`\``;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an elite principal engineer and code reviewer. Provide thorough, 100% bug-free, production-grade code with complete error handling and zero placeholders.",
          temperature: 0.1
        }
      });

      res.json({ result: response.text });
    } catch (error: any) {
      console.error("Code Op error:", error);
      res.status(500).json({ error: error.message || "Failed to execute code operation." });
    }
  });

  // 8. Code Simulation / Execution Sandbox
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
