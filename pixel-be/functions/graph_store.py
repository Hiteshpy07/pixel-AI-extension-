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
    node_type: str  # "project" | "screen" | "chat_message"
    title: str
    content: str
    meta: Dict[str, Any]
    created_at: float
@dataclass
class GraphEdge:
    id: str
    source_id: str
    target_id: str
    relation: str  # "belongs_to_project" | "branch_from" | "semantic_similarity"
    weight: float = 1.0
#these are just two classes decribed to keep the no info , not db includes


#main class that manages enverything
class GraphStore:

    #this two functions are basically for db connection 
    def __init__(self, db_path: str = "pixel_graph.db"):
        self.db_path = db_path
        self._memory_conn = None
        if db_path == ":memory:":
            self._memory_conn = sqlite3.connect(":memory:")
            self._memory_conn.row_factory = sqlite3.Row
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        'return a connection with db with row factory enabled!!'
        if self._memory_conn is not None:
            return self._memory_conn
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn




    def _init_db(self):
        'now as we have recevie the connections and all , here we will create coluns adn rows to fill up data'
        with self._get_connection() as conn:
            cursor = conn.cursor()#what is cursor ? why it is used??

            #creating the table-nodes table
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
            #the edge table is cretaed to establish connection beteen the nodes 
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
            conn.commit() 

              # 3. Speed Indexes (Makes climbing 1,000 nodes take 0.001ms)
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
        """
        Creates a new node in SQLite.
        If parent_id is given, it automatically creates a 'branch_from' edge!
        """
        nid = node_id or f"node_{uuid.uuid4().hex[:8]}"
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
                INSERT OR REPLACE INTO nodes (id, parent_id, node_type, title, content, meta_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (node.id, node.parent_id, node.node_type, node.title, node.content, json.dumps(node.meta), node.created_at)
            )
            # Automatically connect to parent if provided!
            if parent_id:
                edge_id = f"edge_{uuid.uuid4().hex[:8]}"
                cursor.execute(
                    """
                    INSERT OR IGNORE INTO edges (id, source_id, target_id, relation, weight)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (edge_id, node.id, parent_id, "branch_from", 1.0)
                )
            conn.commit()
        return node
    def add_edge(self, source_id: str, target_id: str, relation: str, weight: float = 1.0) -> GraphEdge:
        """Creates an explicit connection (e.g. belongs_to_project or semantic link)."""
        edge_id = f"edge_{uuid.uuid4().hex[:8]}"
        edge = GraphEdge(id=edge_id, source_id=source_id, target_id=target_id, relation=relation, weight=weight)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR IGNORE INTO edges (id, source_id, target_id, relation, weight)
                VALUES (?, ?, ?, ?, ?)
                """,
                (edge.id, edge.source_id, edge.target_id, edge.relation, edge.weight)
            )
            conn.commit()
        return edge



     # -------------------------------------------------------------
    def get_branch_history(self, node_id: str) -> List[GraphNode]:
        """
        MAGIC METHOD:
        Climbs from the current node up to the root ancestor.
        Returns: [RootScreen, BranchQuestion, AIAnswer, SubQuestion]
        Ensures Branch A never sees Branch B's messages (zero crosstalk)!
        """
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
                curr_id = row["parent_id"]  # Climb up to parent!
        chain.reverse()  # Order from oldest ancestor to current node
        return chain
    # -------------------------------------------------------------
    # 5. Obsidian Force-Graph Serializer
    # -------------------------------------------------------------
    def get_graph_data(self) -> Dict[str, Any]:
        """
        Outputs graph in the exact JSON format needed by react-force-graph-2d:
        { "nodes": [...], "links": [...] }
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM nodes ORDER BY created_at ASC")
            node_rows = cursor.fetchall()
            cursor.execute("SELECT * FROM edges")
            edge_rows = cursor.fetchall()
        # Visual sizes for the frontend bubbles
        type_size = {
            "project": 22,       # Big bubble
            "screen": 14,        # Medium bubble
            "chat_message": 9    # Small bubble
        }
        nodes = [
            {
                "id": r["id"],
                "name": r["title"],
                "type": r["node_type"],
                "content": r["content"],
                "val": type_size.get(r["node_type"], 10),
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
# -------------------------------------------------------------
# 🧪 Test Runner
# -------------------------------------------------------------
if __name__ == "__main__":
    print("🧪 Testing GraphStore (In-Memory)...")
    store = GraphStore(":memory:")
    # 1. Create Project
    proj = store.add_node(node_type="project", title="Project: Pixel-BE")
    print(f"Created: {proj.title} (ID: {proj.id})")
    # 2. Create Screen under Project
    screen = store.add_node(node_type="screen", title="FastAPI Auth Screen", parent_id=proj.id)
    store.add_edge(screen.id, proj.id, "belongs_to_project")
    # 3. Branch A: Debug error
    branch_a = store.add_node(node_type="chat_message", title="User: Why 401 Unauthorized?", parent_id=screen.id)
    ans_a = store.add_node(node_type="chat_message", title="AI: Token was expired", parent_id=branch_a.id)
    # 4. Branch B: Refactor in Go (forked from the SAME screen!)
    branch_b = store.add_node(node_type="chat_message", title="User: Rewrite this in Go", parent_id=screen.id)
    # 5. Check Lineage of Branch A (Should NOT see Branch B!)
    lineage = store.get_branch_history(ans_a.id)
    lineage_titles = [n.title for n in lineage]
    print("\n🌿 Branch A Lineage Chain:")
    for t in lineage_titles:
        print(f"   -> {t}")
    assert "User: Rewrite this in Go" not in lineage_titles, "Crosstalk detected!"
    print("✅ Context isolation verified! Branch B is completely invisible to Branch A.")
    # 6. Check Obsidian Graph Output
    graph = store.get_graph_data()
    print(f"\n📊 Obsidian Graph Data: {len(graph['nodes'])} nodes, {len(graph['links'])} links")
    print("🎉 All Graph tests passed!")


    


        

        