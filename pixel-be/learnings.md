# 🧠 Engineering Learnings & Architecture Breakdown: Building Pixel AI

> A comprehensive log of computer vision, knowledge graph architecture, multimodal AI engineering, and privacy pipelines implemented while building **Pixel AI** (an intelligent screen recorder & companion for engineers).
>
> *Use these notes, architecture breakdowns, and talking points for tech blogs, LinkedIn posts, and portfolio documentation.*

---

## 📌 Executive Summary / The Elevator Pitch

Most screen-recording AI assistants do something very naive: they take a massive 4K screenshot, shove the entire image into an LLM, and pray the model finds what matters. 

**This fails in production for three reasons:**
1. **Token Cost & Latency:** Uploading massive 4K frames consumes enormous multimodal tokens and runs slowly.
2. **Resolution Loss:** Downsampling 4K screens blurs dense code lines and small architecture diagram arrows.
3. **Context Blindness:** Linear chat memory (like ChatGPT) collapses when you switch tabs, work on different projects, or branch ideas.

**What we built instead:** A **dual-branch spatial ingestion engine** paired with an **Obsidian-style branching knowledge graph** in SQLite and a **dual vector memory store**.

---

## 🚀 Key Technical Concepts & What We Implemented

```
                    [ Raw Screen Input ]
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
    [ Tab Header (0-70px) ]        [ Viewport Body (>70px) ]
               │                             │
        (Local EasyOCR)              ┌───────┴───────┐
               │                     ▼               ▼
     [ Project Detection ]     [ OpenCV Contours ] [ Local Code OCR ]
               │                     │               │
               │               (Diagram Crops)   (Regex Redaction)
               │                     │               │
               ▼                     ▼               ▼
        ┌─────────────────────────────────────────────────┐
        │        SQLite Directed Acyclic Graph (DAG)       │
        │  Projects ──► Screens ──► Branching Chat Nodes   │
        └────────────────────────┬────────────────────────┘
                                 │
                   ┌─────────────┴─────────────┐
                   ▼                           ▼
        [ Code Vector Store ]       [ Visual Vector Store ]
          (MiniLM-L6-v2)               (CLIP ViT-B-32)
```

---

### 1. Spatial Bisecting & Viewport Segmentation
* **The Concept:** A developer's screen isn't homogenous. The top ~70 pixels contain browser/IDE tabs; the center contains code; side panels contain diagrams.
* **Implementation:** 
  - Using PIL to split incoming frames at `Y = 70px`.
  - The top slice is OCR'd immediately to extract active project keywords (e.g., `github`, `localhost:5001`, `vscode`, `stripe`).
  - Automatically organizes screens under Project nodes in the database without manual user tagging.
* **Key Takeaway:** Segmenting screens spatially *before* passing them to AI models extracts high-value metadata with 0% LLM token overhead.

---

### 2. Computer Vision Diagram Extraction (OpenCV)
* **The Concept:** Why send an entire 1920x1080 screenshot to Gemini Vision if the architecture diagram is only a 400x300 box in the corner?
* **Implementation (`visual_extractor.py`):**
  - **Grayscale & Adaptive Thresholding:** Eliminates background noise and normalizes dark/light IDE themes (`cv2.adaptiveThreshold`).
  - **Morphological Dilation (`cv2.dilate` with a `(17, 17)` rectangular kernel):** Bridges disconnected arrows, text boxes, and micro-lines into unified solid bounding blobs.
  - **Contour Filtering (`cv2.findContours`):** Discards tiny text elements and extracts only large structural visual containers (`w * h > 15,000` px).
  - Saves tight crops of only the diagrams.
* **Token Impact:** Drops multimodal image payload size by **over 75%**, dramatically speeding up Gemini 2.5 Flash response times.

---

### 3. Client-Side Regex Privacy & Secret Redaction
* **The Concept:** Developers frequently display secrets on screen (API keys, Stripe test keys, JWT bearer tokens, database connection URIs, passwords). Sending these unredacted to cloud LLMs violates security compliance.
* **Implementation (`functions/redaction.py`):**
  - Deterministic high-speed regex sanitization running locally before any external API is touched.
  - Matches and masks:
    - OpenAI / Anthropic / Google keys (`sk-[A-Za-z0-9-_]{20,}`, `AIza[0-9A-Za-z-_]{35}`)
    - GitHub Personal Access Tokens (`ghp_[A-Za-z0-9]{36}`)
    - AWS Access Keys (`AKIA[0-9A-Z]{16}`)
    - JWT Tokens (`eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+`)
    - DB Connection Strings (`postgres://`, `mongodb://`, `mysql://`)
    - Passwords, OTP codes, and Bearer tokens.
* **Key Takeaway:** Privacy shouldn't be an afterthought. Sanitizing at the ingestion boundary makes local screen analysis enterprise-safe.

---

### 4. Branching Memory & SQLite Knowledge Graph (Obsidian-Style)
* **The Concept:** Linear chat memory (list of `{"role": "user" | "assistant"}`) cannot represent real developer workflows. You might ask a debugging question about a screen, then later fork from that *same screen* to ask for a rewrite in Go.
* **Implementation (`functions/graph_store.py`):**
  - Implemented a **Directed Acyclic Graph (DAG)** in SQLite with two tables: `nodes` and `edges`.
  - Every node has an explicit `parent_id` and `node_type` (`project`, `screen`, `chat_message`).
  - **Ancestor Lineage Traversal (`get_branch_history`):** Iteratively climbs up `parent_id` pointers to reconstruct the exact branch context without cross-pollinating unrelated conversations.
  - **Force-Graph Serialization (`get_graph_data`):** Serializes nodes and edges directly into the standard D3 / `react-force-graph-2d` format:
    ```json
    { "nodes": [{ "id": "...", "name": "...", "val": 14 }], "links": [{ "source": "...", "target": "..." }] }
    ```
* **Key Takeaway:** Turning conversations into an explicit graph allows you to visualize thoughts like Obsidian and switch branches without forgetting past context.

---

### 5. Dual-Branch Vector Memory & Hybrid Retrieval
* **The Concept:** Code and Architecture Diagrams live in completely different semantic spaces. A code search model cannot understand a flowchart, and an image model cannot read variable names.
* **Implementation (`ai/vector_store.py` & `embedding_engine.py`):**
  - **Code Memory:** 384-dimensional dense vectors using `all-MiniLM-L6-v2` for semantic code, functions, and error messages.
  - **Visual Diagram Memory:** 512-dimensional visual vectors using `clip-ViT-B-32` for shapes, flowcharts, and architecture diagrams.
  - **Hybrid Query Engine (`search_hybrid`):** When the user asks a question in `/chat`, the engine performs concurrent similarity searches across both code and diagram vector spaces to pull the exact relevant past screens and cropped images into Gemini's context window.

---

### 6. Modern Google GenAI SDK Multimodal Streaming
* **The Concept:** Passing local files to cloud APIs usually requires uploading to an S3/GCS bucket first.
* **Implementation (`google-genai` SDK):**
  - Bypassed all cloud storage overhead using `types.Part.from_bytes(data=f.read(), mime_type="image/png")`.
  - Streams local cropped image bytes directly into Gemini 2.5 Flash's in-memory multimodal tensor encoder.
  - Zero cloud hosting bills, zero external S3 buckets, zero file leakage.

---

## 📱 LinkedIn Post Starters (Copy & Adapt)

Here are 3 LinkedIn post angles highlighting the project:

### Option 1: Architecture & Computer Vision Focus (High Engagement)
> **Why sending full screenshots to AI is a bad idea (and how we fixed it with OpenCV) 👇**
>
> When building Pixel AI (our intelligent screen recording companion), our first prototype did what everyone does: take a 4K screenshot and pass it directly to an LLM.
>
> The result? High token bills, slow response times, and blurry downscaled code.
>
> We re-engineered the pipeline with a spatial computer vision approach:
> 1️⃣ **Spatial Slicing:** We bisect the top 70px to extract browser tabs & IDE titles locally. This instantly identifies the project without calling any cloud AI.
> 2️⃣ **OpenCV Diagram Extraction:** Using adaptive thresholding and morphological dilation (17x17 kernel), we detect visual bounding boxes and crop only the system architecture diagrams.
> 3️⃣ **Multimodal Payloads:** We only send the cropped diagram and OCR'd code. Token payload dropped by over 75%!
>
> Sometimes the best AI engineering isn't a bigger prompt—it's traditional computer vision pre-processing.
>
> What's your favorite OpenCV technique in multimodal pipelines?
>
> #ArtificialIntelligence #ComputerVision #Python #OpenCV #FastAPI #MachineLearning

---

### Option 2: The Obsidian-Style Knowledge Graph (Product & Design Focus)
> **Why linear chat history is broken for software engineering 🧠**
>
> ChatGPT and Claude assume conversations are vertical lines: Question ➡️ Answer ➡️ Question ➡️ Answer.
>
> But real developer problem-solving is a **tree**:
> • You capture a screen of an authentication bug.
> • Branch A: "Why am I getting a 401 Unauthorized error?"
> • Branch B: "Can you rewrite this auth logic in Go?"
>
> In a linear chat, Branch B ruins the context of Branch A.
>
> In **Pixel AI**, we built an Obsidian-style branching knowledge graph in SQLite:
> 🔹 Every project, screen, and chat message is a `GraphNode` with a `parent_id`.
> 🔹 When you ask a question, our backend climbs ancestor pointers to reconstruct only *that branch's* context.
> 🔹 We export the graph directly to D3 / `react-force-graph-2d` so developers can click bubbles and visually explore their thought history.
>
> Tree-structured memory > Linear chat memory.
>
> #SoftwareEngineering #GraphDatabase #SQLite #Python #Obsidian #ProductDesign

---

### Option 3: Security & Privacy in AI Tools
> **Building an AI screen companion? You better have client-side redaction.**
>
> If an AI screen recorder captures your screen, it will inevitably capture:
> ⚠️ Stripe API keys
> ⚠️ JWT bearer tokens
> ⚠️ Database credentials
> ⚠️ Passwords & OTPs
>
> You cannot let these touch a cloud LLM.
>
> In Pixel AI, we added a deterministic redaction layer before any API call:
> • Regex engine scans for known token signatures (`sk-`, `ghp_`, `AKIA...`, `postgres://`).
> • Sensitive values are masked locally in memory (`[REDACTED_API_KEY]`).
> • Zero secrets leaked to cloud providers.
>
> Privacy can't be an afterthought in agentic tools—it has to be at the ingestion gate.
>
> #CyberSecurity #DataPrivacy #AI #FastAPI #Python #DevSecOps

---

## 🛠️ Tech Stack Cheat Sheet

| Layer | Technologies Used |
| :--- | :--- |
| **Backend Framework** | FastAPI, Uvicorn, Pydantic |
| **Computer Vision** | OpenCV (`cv2`), PIL (`Pillow`), NumPy |
| **OCR Engines** | EasyOCR (Local CPU/MPS) |
| **Multimodal LLM** | Google Gemini 2.5 Flash via `google-genai` SDK |
| **Graph Database** | SQLite (Self-referential adjacency DAG schema) |
| **Embeddings & Search** | `sentence-transformers` (MiniLM-L6-v2) + CLIP (ViT-B-32) + Scikit-Learn Cosine Similarity |
| **Frontend** | React 19, Tailwind CSS v4, Lucide Icons, Vite |
| **Graph Visualization** | Obsidian-style D3 Force Simulation (`react-force-graph-2d`) |
