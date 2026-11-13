import sqlite3
import json
import uuid
import time
from typing import List, Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class GraphNode:
    id: str
    parent_id: Optional[str]
    node_type: str  # "project" | "screen" | "chat_message" | "concept"
    title: str
    content: str
    meta: Dict[str, Any]
    created_at: float


@dataclass
class GraphEdge:
    id: str
    source_id: str
    target_id: str
    relation: str  # "branch_from" | "belongs_to_project" | "semantic_similarity"
    weight: float = 1.0


class GraphStore:
    """
    Persistent SQLite Graph Store for Obsidian-style branching memory.
    Supports branching chat trees (DAGs), screen capture snapshots,
    cross-tab project links, and force-graph payloads for UI visualization.
    """

    def __init__(self, db_path: str = "pixel_graph.db"):
        self.db_path = db_path
        self._memory_conn = None
        if db_path == ":memory:":
            self._memory_conn = sqlite3.connect(":memory:")
            self._memory_conn.row_factory = sqlite3.Row
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        if self._memory_conn is not None:
            return self._memory_conn
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS nodes (
                    id TEXT PRIMARY KEY,
                    parent_id TEXT,
                    node_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT,
                    meta_json TEXT,
                    created_at REAL NOT NULL,
                    FOREIGN KEY (parent_id) REFERENCES nodes (id) ON DELETE SET NULL
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS edges (
                    id TEXT PRIMARY KEY,
                    source_id TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    relation TEXT NOT NULL,
                    weight REAL DEFAULT 1.0,
                    FOREIGN KEY (source_id) REFERENCES nodes (id) ON DELETE CASCADE,
                    FOREIGN KEY (target_id) REFERENCES nodes (id) ON DELETE CASCADE
                )
            """)

            cursor.execute("CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes (parent_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_edges_source ON edges (source_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_edges_target ON edges (target_id)")
            conn.commit()

    def add_node(
        self,
        node_type: str,
        title: str,
        content: str = "",
        parent_id: Optional[str] = None,
        meta: Optional[Dict[str, Any]] = None,
        node_id: Optional[str] = None
    ) -> GraphNode:
        nid = node_id or f"node_{uuid.uuid4().hex[:10]}"
        now = time.time()
        meta = meta or {}

        node = GraphNode(
            id=nid,
            parent_id=parent_id,
            node_type=node_type,
            title=title,
            content=content,
            meta=meta,
            created_at=now
        )

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO nodes (id, parent_id, node_type, title, content, meta_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (node.id, node.parent_id, node.node_type, node.title, node.content, json.dumps(node.meta), node.created_at)
            )

            if parent_id:
                edge_id = f"edge_{uuid.uuid4().hex[:10]}"
                cursor.execute(
                    """
                    INSERT INTO edges (id, source_id, target_id, relation, weight)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (edge_id, node.id, parent_id, "branch_from", 1.0)
                )

            conn.commit()
        return node

    def add_edge(self, source_id: str, target_id: str, relation: str, weight: float = 1.0) -> GraphEdge:
        edge_id = f"edge_{uuid.uuid4().hex[:10]}"
        edge = GraphEdge(id=edge_id, source_id=source_id, target_id=target_id, relation=relation, weight=weight)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO edges (id, source_id, target_id, relation, weight)
                VALUES (?, ?, ?, ?, ?)
                """,
                (edge.id, edge.source_id, edge.target_id, edge.relation, edge.weight)
            )
            conn.commit()
        return edge

    def get_node(self, node_id: str) -> Optional[GraphNode]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM nodes WHERE id = ?", (node_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return GraphNode(
                id=row["id"],
                parent_id=row["parent_id"],
                node_type=row["node_type"],
                title=row["title"],
                content=row["content"],
                meta=json.loads(row["meta_json"] or "{}"),
                created_at=row["created_at"]
            )

    def get_branch_history(self, node_id: str) -> List[GraphNode]:
        chain = []
        curr_id = node_id
        visited = set()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            while curr_id and curr_id not in visited:
                visited.add(curr_id)
                cursor.execute("SELECT * FROM nodes WHERE id = ?", (curr_id,))
                row = cursor.fetchone()
                if not row:
                    break
                node = GraphNode(
                    id=row["id"],
                    parent_id=row["parent_id"],
                    node_type=row["node_type"],
                    title=row["title"],
                    content=row["content"],
                    meta=json.loads(row["meta_json"] or "{}"),
                    created_at=row["created_at"]
                )
                chain.append(node)
                curr_id = row["parent_id"]

        chain.reverse()
        return chain

    def get_children(self, parent_id: str) -> List[GraphNode]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM nodes WHERE parent_id = ? ORDER BY created_at ASC", (parent_id,))
            rows = cursor.fetchall()
            return [
                GraphNode(
                    id=r["id"],
                    parent_id=r["parent_id"],
                    node_type=r["node_type"],
                    title=r["title"],
                    content=r["content"],
                    meta=json.loads(r["meta_json"] or "{}"),
                    created_at=r["created_at"]
                )
                for r in rows
            ]

    def get_graph_data(self) -> Dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM nodes ORDER BY created_at ASC")
            node_rows = cursor.fetchall()

            cursor.execute("SELECT * FROM edges")
            edge_rows = cursor.fetchall()

        type_size = {
            "project": 18,
            "screen": 12,
            "chat_message": 8,
            "concept": 10
        }

        nodes = [
            {
                "id": r["id"],
                "name": r["title"],
                "type": r["node_type"],
                "content": (r["content"][:80] + "...") if r["content"] and len(r["content"]) > 80 else r["content"],
                "val": type_size.get(r["node_type"], 8),
                "created_at": r["created_at"],
                "meta": json.loads(r["meta_json"] or "{}")
            }
            for r in node_rows
        ]

        links = [
            {
                "id": r["id"],
                "source": r["source_id"],
                "target": r["target_id"],
                "relation": r["relation"],
                "weight": r["weight"]
            }
            for r in edge_rows
        ]

        return {"nodes": nodes, "links": links}
