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
                INSERT INTO nodes (id, parent_id, node_type, title, content, meta_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (node.id, node.parent_id, node.node_type, node.title, node.content, json.dumps(node.meta), node.created_at)
            )
            # Automatically connect to parent if provided!
            if parent_id:
                edge_id = f"edge_{uuid.uuid4().hex[:8]}"
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
        """Creates an explicit connection (e.g. belongs_to_project or semantic link)."""
        edge_id = f"edge_{uuid.uuid4().hex[:8]}"
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


    


        

        