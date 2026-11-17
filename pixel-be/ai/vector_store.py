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



    def search_code():
        """search code using similarity search."""


        