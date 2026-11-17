import os
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional, Union
import numpy as np
from PIL import Image


sys.path.append(str(Path(__file__).resolve().parent.parent)) #for the lading of al the files adn functions from other modules
#learn more of this , its really a project coming from js 


# Lazy-loaded model instances
_text_model = None
_clip_model = None

#yeah lazy loading is also a diff shit , learn about it , it will teach more about optiomisnation 

def text_model():
    '''this is  used for lazy loadin of the text model '''

    global _text_model
    if _text_model is None:
        try:
            from sentence_transformers import SentenceTransformer  
             print("⏳ Loading 384-d MiniLM model (all-MiniLM-L6-v2)...")
            _text_model = SentenceTransformer("all-MiniLM-L6-v2")
            print("text model ready ")

        except ImportError:
            print("failed loading text mdoel")

    return _text_model

def clipmodel():
    '''use to lazy load the clip model'''
    global _clip_model
    if _clip_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            print("⏳ Loading 768-d CLIP (ViT-B/32)...")  
            _clip_model = SentenceTransformer("clip-ViT-B-32")
            print("clip model ready")
        except ImportError:
            print("failed loading clip model")

    return _clip_model


#thisis done to keep or scope free and dont freeeze when the models will be impiorted at the start of the code 
#it will be imported when requeired
