import React, { useState, useEffect, useRef } from "react";
import { apiFetch } from "../utils/api";
import {
  GitBranch,
  RefreshCw,
  Sparkles,
  MessageSquare,
  Folder,
  Camera,
  Layers,
  Send,
  X,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Terminal,
  Clock,
  ChevronRight
} from "lucide-react";

export default function KnowledgeGraphExplorer({ onSelectBranch }) {
  // Graph Data
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState("all"); // "all" | "project" | "screen" | "chat_message"

  // Selected Node & Lineage Context State
  const [selectedNode, setSelectedNode] = useState(null);
  const [branchChain, setBranchChain] = useState([]);
  const [isChainLoading, setIsChainLoading] = useState(false);
  const [branchInput, setBranchInput] = useState("");
  const [isBranchChatLoading, setIsBranchChatLoading] = useState(false);

  // Canvas Viewport Pan & Zoom
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Physics Simulation Coordinates
  const [nodePositions, setNodePositions] = useState({});
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Fetch graph from backend
  const fetchGraph = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch("http://localhost:5001/graph");
      if (data && data.nodes) {
        setGraphData(data);
        initializePhysics(data.nodes, data.links);
      }
    } catch (err) {
      console.error("Failed to fetch graph:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  // Initialize random & spring-like positions for nodes
  const initializePhysics = (nodes = [], links = []) => {
    const width = 800;
    const height = 500;
    const pos = {};

    nodes.forEach((n, idx) => {
      // Place projects in center-left, screens in center, chats branching right
      const angle = (idx / Math.max(1, nodes.length)) * 2 * Math.PI;
      const radius = n.type === "project" ? 90 : n.type === "screen" ? 180 : 260;
      pos[n.id] = {
        x: width / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
        y: height / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
      };
    });
    setNodePositions(pos);
  };

  // Fetch branch history when a node is clicked
  const handleNodeClick = async (node) => {
    setSelectedNode(node);
    setIsChainLoading(true);

    try {
      const data = await apiFetch(`http://localhost:5001/graph/branch/${node.id}`);
      if (data && data.chain) {
        setBranchChain(data.chain || []);
      }
    } catch (err) {
      console.error("Failed to fetch branch history:", err);
    } finally {
      setIsChainLoading(false);
    }
  };

  // Send a new chat message branching directly from this node
  const handleSendBranchChat = async () => {
    if (!branchInput.trim() || !selectedNode || isBranchChatLoading) return;

    const userPrompt = branchInput.trim();
    setBranchInput("");
    setIsBranchChatLoading(true);

    try {
      const data = await apiFetch("http://localhost:5001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userPrompt,
          parent_node_id: selectedNode.id,
        }),
      });

      if (data && data.ai_node_id) {
        // Refresh graph to show the newly sprouted branch node
        await fetchGraph();
        // Update current chain
        handleNodeClick({ id: data.ai_node_id, title: `AI: ${data.reply.slice(0, 30)}...`, node_type: "chat_message" });
      }
    } catch (err) {
      console.error("Error creating branch chat:", err);
    } finally {
      setIsBranchChatLoading(false);
    }
  };

  // Dragging / Panning on SVG canvas
  const handleMouseDown = (e) => {
    if (e.target.tagName === "svg" || e.target.id === "canvas-bg") {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Node Color Schemes
  const getNodeColor = (type) => {
    switch (type) {
      case "project":
        return { fill: "#f59e0b", stroke: "#fbbf24", glow: "rgba(245, 158, 11, 0.4)", text: "text-amber-300" };
      case "screen":
        return { fill: "#8b5cf6", stroke: "#a78bfa", glow: "rgba(139, 92, 246, 0.4)", text: "text-purple-300" };
      case "chat_message":
      default:
        return { fill: "#10b981", stroke: "#34d399", glow: "rgba(16, 185, 129, 0.4)", text: "text-emerald-300" };
    }
  };

  const filteredNodes = graphData.nodes.filter(
    (n) => filterType === "all" || n.type === filterType
  );

  return (
    <div className="w-full h-full min-h-[640px] flex flex-col bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative font-sans">
      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER CONTROLS                                           */}
      {/* ------------------------------------------------------------- */}
      <div className="px-6 py-4 bg-zinc-900/80 border-b border-white/5 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Obsidian Knowledge Graph & Contexts</span>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono">
                {graphData.nodes.length} Nodes • {graphData.links.length} Links
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Interactive memory map of your recorded screens, projects, and branching discussions.
            </p>
          </div>
        </div>

        {/* Filter Chips & View Controls */}
        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-white/10 text-xs">
            {[
              { id: "all", label: "All" },
              { id: "project", label: "Projects" },
              { id: "screen", label: "Screens" },
              { id: "chat_message", label: "Chats" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`px-3 py-1 rounded-lg font-medium transition-all text-[11px] ${
                  filterType === f.id
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setPan({ x: 0, y: 0 });
              setZoom(1);
            }}
            title="Reset View"
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={fetchGraph}
            title="Refresh Graph"
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MAIN GRAPH CANVAS & SIDEBAR                                   */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* SVG Interactive Canvas */}
        <div
          className="flex-1 h-full relative cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          id="canvas-bg"
        >
          {/* Subtle Dot Matrix Background */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle, #a855f7 1px, transparent 1px)`,
              backgroundSize: "24px 24px",
            }}
          />

          {filteredNodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-zinc-500 gap-3">
              <Layers className="w-10 h-10 text-zinc-600 animate-pulse" />
              <p className="text-sm font-semibold text-zinc-400">No Graph Memory Detected</p>
              <p className="text-xs max-w-sm text-zinc-500">
                Snip a screen with the floating avatar or Space + P. Pixel will automatically bisect tabs, extract diagrams, and plant nodes here in SQLite!
              </p>
            </div>
          ) : (
            <svg
              ref={canvasRef}
              className="w-full h-full"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center center",
                transition: isPanning ? "none" : "transform 0.1s ease-out",
              }}
            >
              {/* Edges / Connections */}
              <g className="links">
                {graphData.links.map((link) => {
                  const src = nodePositions[link.source];
                  const tgt = nodePositions[link.target];
                  if (!src || !tgt) return null;

                  return (
                    <line
                      key={link.id}
                      x1={src.x}
                      y1={src.y}
                      x2={tgt.x}
                      y2={tgt.y}
                      stroke="rgba(168, 85, 247, 0.25)"
                      strokeWidth={link.relation === "belongs_to_project" ? 2.5 : 1.5}
                      strokeDasharray={link.relation === "branch_from" ? "4 4" : "none"}
                    />
                  );
                })}
              </g>

              {/* Nodes / Floating Bubbles */}
              <g className="nodes">
                {filteredNodes.map((n) => {
                  const pos = nodePositions[n.id] || { x: 400, y: 250 };
                  const color = getNodeColor(n.type);
                  const isSelected = selectedNode?.id === n.id;
                  const radius = n.type === "project" ? 24 : n.type === "screen" ? 18 : 13;

                  return (
                    <g
                      key={n.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      className="cursor-pointer transition-transform duration-150 hover:scale-125"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNodeClick(n);
                      }}
                    >
                      {/* Outer Glow */}
                      <circle
                        r={radius + (isSelected ? 8 : 4)}
                        fill={color.glow}
                        className={isSelected ? "animate-pulse" : ""}
                      />

                      {/* Main Node Circle */}
                      <circle
                        r={radius}
                        fill={color.fill}
                        stroke={isSelected ? "#ffffff" : color.stroke}
                        strokeWidth={isSelected ? 3 : 1.5}
                        className="shadow-xl"
                      />

                      {/* Node Label Text */}
                      <text
                        y={radius + 14}
                        textAnchor="middle"
                        fill="#e4e4e7"
                        fontSize="10"
                        fontWeight="600"
                        className="pointer-events-none drop-shadow-md select-none font-sans"
                      >
                        {n.name?.length > 18 ? `${n.name.slice(0, 18)}...` : n.name}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          )}

          {/* Floating Canvas Controls (Zoom In/Out) */}
          <div className="absolute bottom-5 left-5 flex gap-1.5 bg-zinc-900/90 border border-white/10 rounded-2xl p-1.5 backdrop-blur-md shadow-xl">
            <button
              onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="px-2 py-1 text-[10px] font-mono text-zinc-400 flex items-center">
              {Math.round(zoom * 100)}%
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* RIGHT DRAWER: CONTEXT & BRANCH INSPECTOR                   */}
        {/* ----------------------------------------------------------- */}
        {selectedNode && (
          <div className="w-[380px] h-full bg-zinc-900/95 border-l border-white/10 backdrop-blur-2xl flex flex-col z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <span
                  className={`text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border ${
                    getNodeColor(selectedNode.type).text
                  } bg-white/5`}
                >
                  {selectedNode.type}
                </span>
                <h3 className="text-xs font-bold text-white truncate max-w-[200px]">
                  {selectedNode.name || selectedNode.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Node Metadata & Ancestor Lineage Thread */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
              {/* Node Overview Card */}
              <div className="p-3 rounded-2xl bg-zinc-950/80 border border-white/5 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Node Details
                </span>
                <div className="text-[11px] font-mono text-purple-300 truncate">
                  ID: {selectedNode.id}
                </div>
                {selectedNode.content && (
                  <div className="text-zinc-300 leading-relaxed max-h-24 overflow-y-auto whitespace-pre-wrap bg-zinc-900/60 p-2 rounded-xl text-[11px] font-mono">
                    {selectedNode.content}
                  </div>
                )}
              </div>

              {/* Ancestor Branch Chain */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-indigo-400" />
                    Conversation Lineage ({branchChain.length} steps)
                  </span>
                </div>

                {isChainLoading ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-zinc-500">
                    <div className="w-5 h-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                    <span className="text-[11px]">Traversing ancestors in SQLite...</span>
                  </div>
                ) : branchChain.length === 0 ? (
                  <p className="text-[11px] text-zinc-500 italic p-2">
                    Root node. No parent ancestors above this point.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-white/10">
                    {branchChain.map((step, idx) => {
                      const isTarget = step.id === selectedNode.id;
                      return (
                        <div
                          key={step.id || idx}
                          className={`relative pl-8 flex flex-col gap-1 text-[11px] p-2 rounded-xl transition-all ${
                            isTarget
                              ? "bg-purple-950/40 border border-purple-500/30 text-white"
                              : "text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          {/* Dot on Timeline */}
                          <div
                            className={`absolute left-2.5 top-3 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${
                              isTarget ? "bg-purple-400" : "bg-zinc-600"
                            }`}
                          />
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-zinc-200 text-[10.5px]">
                              {step.title}
                            </span>
                          </div>
                          {step.content && (
                            <p className="text-[10px] text-zinc-400 line-clamp-2">
                              {step.content}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Branch Chat Input (Sprout new branch directly from this node) */}
            <div className="p-3 bg-zinc-950 border-t border-white/10 flex flex-col gap-2">
              <span className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" />
                Branch off a new question from this node:
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={branchInput}
                  onChange={(e) => setBranchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendBranchChat()}
                  placeholder="Ask a question from this point..."
                  className="flex-1 text-xs bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500 transition-colors placeholder:text-zinc-600"
                />
                <button
                  onClick={handleSendBranchChat}
                  disabled={isBranchChatLoading || !branchInput.trim()}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white px-3 py-2 rounded-xl transition-all shadow-md shadow-purple-600/30 flex items-center justify-center"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
