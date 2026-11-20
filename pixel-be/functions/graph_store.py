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


    


        

        