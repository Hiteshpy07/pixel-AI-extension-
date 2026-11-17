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


    def index_screen():
        """storing a captured screen(text and diagrams) into memory."""
    def search_code():
        """search code using similarity search."""


        