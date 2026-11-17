from langchain_core._api.path import HERE
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



def embed_text(text:str)->np.ndarray: #what is np.ndarray? lean more about it 
    "this function will turn the text into embeddings"
    if not text:
        return np.zeros(384, dtype=np.float32) #a standard empty embeddings to the stoirage 
    model = text_model()

    if model:
        vector = model.encode(text, normalize_embeddings=True)
        return np.array(vector, dtype=np.float32)
    # retun type f the embeddings


    else:
        # Fallback if model failed to load
        np.random.seed(abs(hash(text)) % (2**32))
        v = np.random.randn(384).astype(np.float32)
        return v / np.linalg.norm(v)

        # "If the AI model isn't downloaded yet, take the text, turn its letters into a fixed seed, generate 384 numbers, normalize their length to 1.0, and return it so the rest of the application can keep running smoothly without crashing."




def embed_diagrams(image_input:Union[str,Image.Image])->np.ndarray: 
    "this will turn the diagrmas into embeddings"

    if isinstance(image_input,str):#checking ehher we are give a str(image path ) as the unput to this fucntion 
        if not os.path(image_input):
            return np.zeros(512, dtype=np.float32) #fallback embeddings

        img=Image.open(image_input).convert('RGB')
    else:#the imput may be given as bytes, base64 
        img=image_input

    model=clipmodel
    if model :
        vector = model.encode(img, normalize_embeddings=True)
        return np.array(vector, dtype=np.float32)

    else:
        np.random.seed(img.size[0] * img.size[1])
        v = np.random.randn(512).astype(np.float32)
        return v / np.linalg.norm(v)

    #same a fallback to conbvert the erro in to a 512 bit embedding so that the process dont stop and the proxces runs smoothly



# now our query will contain text only , as we are talking. about a screen shot , and not a specific part , so the oerall image will be availabe for the query and thet text we have given will be availabe as the input 
def embed_query(query:str)->np.ndarray:
    '''this functiuon will be used to convert the query asked by the user to converted into embeddings for cosine seraching it '''
    #mehre the wuery will be converted to 512 d space so that i can be searched in bith the text and images sucessfully 
    #clip model will be used to do that 
    model=clipmodel()

    if model:
        vector = model.encode(query, normalize_embeddings=True)
        return np.array(vector, dtype=np.float32)

    else:
        np.random.seed(abs(hash(query)) % (2**32))
        v = np.random.randn(512).astype(np.float32)
        return v / np.linalg.norm(v)
        #same fall back to randomise the erorr so that the process dont stop 

"Why do we need a separate function embed_query_for_diagrams()? Why can't I just reuse embed_text() or embed_diagram() to convert my search query?"

'''
💡 The Answer (in 3 Simple Points):

If you use embed_text():

It uses MiniLM, which outputs 384 numbers.
Your diagrams have 512 numbers.
You can't compare a 384-length list with a 512-length list 
→
→ it crashes with an error.

If you use embed_diagram():

It expects an image file on your disk (like "diagram1.png").
If you give it the words "auth flowchart", it searches your hard drive for a file named "auth flowchart" 
→
→ it crashes because the file doesn't exist.

Why embed_query_for_diagrams() is necessary:

It uses CLIP’s built-in text encoder.
It translates your text query into 512 numbers that speak the exact same language as the 512 numbers of the diagram image!

    
        '''
            

