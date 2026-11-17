import os 
import sys
from pathlib import Path
from typing import List, Dict, Any
import numpy as np


sys.path.append(str(Path(__file__).resolve().parent.parent))

from ai.embedding_engine import embed_diagrams , embed_query , embed_text

#using class methodolgy fo rthe first time hgere

class VectorStore:
    def __init__(self):
        self.text_records: List[Dict[str, Any]] = []
        self.visual_records: List[Dict[str, Any]] = []
#local vector db using numpy , no third party DBs for now 



    def index_screen(
        self,
        screen_id: str,
        project_name: str,
        code_text: str,
        diagram_crops: List[Dict[str, Any]]
    ):
        """storing a captured screen(text and diagrams) into memory."""
        if code_text and code_text.strip:
            text_vector=embed_text(code_text)
            self.text_records.append({
                "record_id": f"{screen_id}_text",
                "screen_id": screen_id,
                "project": project_name,
                "text": code_text,
                "vector": text_vector,
            })

        for crop in diagram_crops:
            crop_path = crop.get("file_path")
            if crop_path and os.path.exists(crop_path):
                img_vec = embed_diagrams(crop_path)
                self.visual_records.append({
                    "record_id": crop.get("crop_id", f"{screen_id}_crop"),
                    "screen_id": screen_id,
                    "project": project_name,
                    "file_path": crop_path,
                    "label": crop.get("label", "diagram"),
                    "vector": img_vec
                })

        print(f"📌 Indexed '{screen_id}' in '{project_name}'")



    def search_code(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """search code using similarity search."""
        if not self.text_records:# self.textrecords is the text vector dict locally 
            return [] 

        query_vector=embed_query(query)
        scored = []
        for record in self.text_records:
            score = float(np.dot(query_vector, record["vector"]))
            scored.append({**record, "similarity": score})
        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return scored[:top_k]



    def search_diagrams(self, query_img_path: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Search for similar visual components (buttons, cards, forms, etc.)."""
        if not self.visual_records:
            return []

        query_vector = embed_diagrams(query_img_path)
        scored = []
        for record in self.visual_records:
            score = float(np.dot(query_vector, record["vector"]))
            scored.append({**record, "similarity": score})
        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return scored[:top_k]


    def search_hybrid(self, query: str, top_k: int = 3) -> Dict[str, Any]:
        """Multi-modal search across code + diagrams (for advanced agents)."""
        code_results = self.search_code(query, top_k=top_k)
        # In a real app, we'd embed the query as an image too or do cross-modal search
        # For now, we'll just return both
        return {
            "query": query,
            "code_matches": code_results,
            "visual_matches": []  # Add visual search later
        }


# making this a singleton  for global access accross project
vector_db = VectorStore()


        