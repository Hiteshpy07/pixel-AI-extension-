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



    class GraphStore:
        def __init__(self, db_path: str = "pixel_graph.db"):
            ''
        def _get_connection(self) -> sqlite3.Connection:
            ''

        

        