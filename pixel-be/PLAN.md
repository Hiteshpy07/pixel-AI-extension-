# 🗺️ Pixel AI: Project Architecture & Future Roadmap

**Pixel** is an intelligent AI screen recorder and developer companion that captures screenshots/screen recordings, extracts text/code, explains bugs, translates code, and converts UI designs into production-ready React components using **Google Gemini Vision** and **Local EasyOCR**.

---

## 🏗️ System Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                  USER INTERFACES                                       │
│  1. Chrome Extension (Manifest V3)           2. Web Studio (React + Vite + Tailwind)   │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │  HTTP / Streaming (Port 5001)
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              FASTAPI BACKEND (Python 3.14)                             │
│  ├── /stream-analyze (Gemini 2.5 Flash Vision Streaming)                               │
│  ├── /analyze        (Full Multimodal Reasoning)                                       │
│  ├── /ocr            (Local EasyOCR Engine via PyTorch/MPS)                            │
│  ├── /chat           (Multi-Turn Contextual Assistant with SQLite Memory)              │
│  ├── /sessions       (Multi-Conversation Session Management)                           │
│  └── /health         (Status & Heartbeat)                                              │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               LOCAL STORAGE & GUARDS                                   │
│  ├── pixel_memory.db        (SQLite: Isolated Session Memory & Chat History)           │
│  ├── Redaction Shield       (Local EasyOCR + OpenCV PII / Secret Blackout)             │
│  └── Smart Dynamic Router   (Text vs Diagram Detection to Save 80% Tokens)             │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ✅ Completed Milestones

- [x] **FastAPI Backend Migration**: Rewrote legacy Express backend to modern async Python FastAPI.
- [x] **Dual-Engine Evaluation**: Benchmarked local **EasyOCR** against **Gemini Vision Multimodal AI**.
- [x] **Sub-Second Token Streaming**: Implemented `/stream-analyze` with `StreamingResponse` to drop perceived latency to `< 800ms`.
- [x] **Interactive Web Studio (`pixel-fe`)**:
  - Global clipboard paste (`Cmd + V`) and drag-and-drop dropzone.
  - Multi-engine toggle: *Gemini Vision*, *Screen-to-Code*, *EasyOCR*.
  - Floating draggable assistant avatar with live screen cropping overlay.
  - Formatted code blocks with syntax highlighting and one-click copy.
  - Interactive multi-turn chat tab.

---

## 🚀 Phased Future Roadmap

### 📍 Phase 1: Frontend & UX Polish (Immediate)
- [ ] **Toast Notifications**: Add sleek feedback alerts for "Code copied to clipboard" and "Screenshot captured".
- [ ] **Full Markdown Enhancements**: Support interactive markdown tables, bullet lists, and LaTeX math rendering.
- [ ] **Export Options**: Allow one-click download of generated React code files (`.jsx` / `.tsx`) or analysis reports as `.md`.

---

### 📍 Phase 2: Chrome Extension Integration (`pixel-extension`)
- [ ] **Area Selection Screen Grabber**: Allow users to drag a box over any browser tab using `chrome.desktopCapture` and Canvas cropping.
- [ ] **Global Hotkeys**:
  - `Cmd + Shift + X` (Mac) / `Alt + S` (Windows): Instant screen capture.
  - `Cmd + Shift + C`: Instant OCR to clipboard.
- [ ] **Content Script Floating Widget**: Inject the floating Pixel avatar onto active webpages.
- [ ] **DOM & Context Injection**: Send the active tab URL and selected DOM text alongside the screenshot to Gemini for 100% accurate context.

---

### 📍 Phase 3: High-Impact Developer AI Features
- [ ] **Screenshot-to-Code (UI Cloning)**:
  - Drag over any website component (navbar, card, pricing table, form).
  - Gemini generates clean, responsive **Tailwind CSS + React / HTML** code matching the exact layout and colors.
- [ ] **Live Debugger & Stack Trace Fixer**:
  - Crop error logs from terminal / browser console.
  - AI identifies root cause file + line number and gives a 1-click **"Copy Fix"** diff.
- [ ] **Screen-Aware Code Translator**:
  - Highlight code on video tutorials or PDFs in Python/Java.
  - Instantly convert it to TypeScript, Rust, or Go with explanatory comments.
- [ ] **Smart Dynamic Routing (Cost & Token Optimizer)**:
  - Detect text-only terminal screens vs. visual diagrams/UI.
  - Route text-only screens through local EasyOCR + text LLM (saves ~80% on cloud tokens).
  - Route flowcharts and diagrams directly to Gemini Vision.

---

### 📍 Phase 4: Local Privacy & Multi-Session Memory (Antigravity Architecture)
- [ ] **On-Device PII & Secret Redaction Shield**:
  - Use local regex and OpenCV canvas masking to automatically detect and blur API keys (`AIza...`, `sk-...`, `Bearer...`, JWT tokens, passwords, OTPs) **before** sending pixels to the cloud.
- [ ] **Multi-Session Conversation Manager (Isolated Memory)**:
  - Persistent SQLite database (`pixel_memory.db`) to store separate conversation sessions with custom titles.
  - Switch between active sessions in a sidebar (like Antigravity / ChatGPT).
- [ ] **Sliding Window & Context Summarization**:
  - Auto-summarize conversations exceeding 20 turns to preserve token limits while retaining critical background facts.
- [ ] **Local Vector Search ("Search My Past Screens")**:
  - Embed screen text with lightweight embeddings to enable semantic search (*"Find the Docker command screenshot from yesterday"*).
- [ ] **Voice Query Support**:
  - Hold a mic button and speak follow-up questions to your screenshot using Web Speech API or Gemini Live audio.

---

### 📍 Phase 5: Production Deployment & Release
- [ ] **Multi-Tier Model Fallback**:
  - Failover cascade: `gemini-2.5-flash` ➡️ `gemini-2.0-flash` ➡️ `OpenAI / Groq` ➡️ `Local EasyOCR` (zero downtime on 429 quota exhaustion).
- [ ] **Docker Containerization**:
  - Create a production multi-stage `Dockerfile` for the FastAPI backend.
- [ ] **One-Click Cloud Deployment**:
  - Setup automated deployment on **Render**, **Railway**, or **Fly.io**.
- [ ] **Chrome Web Store Packaging**:
  - Complete Manifest V3 review compliance, write privacy policy, and submit to the Chrome Web Store.

---

## 🛠️ Quick Commands Reference

### Backend (`pixel-be`)
```bash
# Activate virtual environment
source .venv/bin/activate

# Run FastAPI dev server with auto-reload
uvicorn main:app --port 5001 --reload

# Run benchmark comparison script
python test_compare.py
```

### Frontend (`pixel-fe`)
```bash
# Start Vite development server
npm run dev

# Build production bundle
npm run build
```
