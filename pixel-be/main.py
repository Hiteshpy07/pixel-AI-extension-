from dotenv.main import _load_dotenv_disabled
import os
import base64
import warnings
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai import types

# # Suppress PyTorch MPS pin_memory warning on macOS
# warnings.filterwarnings("ignore", category=UserWarning)

# # Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("⚠️ WARNING: GEMINI_API_KEY not found in environment or .env file.")

# Initialize Gemini Client
client = genai.Client(api_key=GEMINI_API_KEY)

# # Lazy loading for EasyOCR reader
# easyocr_reader = None

# def get_ocr_reader():
#     global easyocr_reader
#     if easyocr_reader is None:
#         import easyocr
#         easyocr_reader = easyocr.Reader(['en'])
#     return easyocr_reader

# # Initialize FastAPI App
app = FastAPI(
    title="Pixel Brain Backend",
    description="Python FastAPI backend for Pixel AI Screen Recorder with Gemini Vision & EasyOCR",
    version="1.1.0"
)

# CORS Configuration
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://screengrabber.netlify.app",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# # Request / Response Schemas
# class AnalyzeRequest(BaseModel):
#     image: str
#     prompt: Optional[str] = "Analyze this screenshot in detail. If code or errors are visible, explain what it does and how to improve or fix it."
#     mode: Optional[str] = "vision"  # "vision" | "code" | "ocr"

# class ChatMessage(BaseModel):
#     role: str
#     text: str

# class ChatRequest(BaseModel):
#     message: str
#     analysis: Optional[str] = ""
#     history: Optional[List[ChatMessage]] = []

# class OCRRequest(BaseModel):
#     image: str
#     with_ai_summary: Optional[bool] = False
#     prompt: Optional[str] = "Summarize the extracted text and highlight key points."

# def clean_base64_image(image_data: str) -> tuple[bytes, str]:
#     """Helper to strip data URI headers and decode base64 image bytes."""
#     mime_type = "image/png"
#     if "," in image_data:
#         header, base64_str = image_data.split(",", 1)
#         if "image/jpeg" in header:
#             mime_type = "image/jpeg"
#         elif "image/webp" in header:
#             mime_type = "image/webp"
#     else:
#         base64_str = image_data

#     try:
#         decoded_bytes = base64.b64decode(base64_str)
#         return decoded_bytes, mime_type
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=f"Invalid base64 image encoding: {str(e)}")

# @app.get("/")
# def root():
#     return {"status": "ok", "message": "🚀 Pixel Brain is live (FastAPI)"}

# @app.get("/health")
# def health():
#     return {"status": "healthy"}

# @app.post("/stream-analyze")
# async def stream_analyze_screenshot(payload: AnalyzeRequest):
#     """Stream response tokens in real-time using Server-Sent Events / Chunked transfer."""
#     if not payload.image:
#         raise HTTPException(status_code=400, detail="No image data received")

#     try:
#         image_bytes, mime_type = clean_base64_image(payload.image)
#         prompt_prefix = "You are Pixel, an expert software engineer and AI screen companion. "
#         if payload.mode == "code":
#             prompt_prefix += "Convert the UI or code in this screenshot into clean, production-ready React + Tailwind CSS components with minimal explanations. "
#         elif payload.mode == "ocr":
#             reader = get_ocr_reader()
#             lines = reader.readtext(image_bytes, detail=0)
#             full_text = "\n".join(lines)
#             def stream_ocr():
#                 yield f"### 📝 Extracted Text:\n\n{full_text}"
#             return StreamingResponse(stream_ocr(), media_type="text/plain")
        
#         full_prompt = f"{prompt_prefix}\n\nUser Request: {payload.prompt}"

#         def generate_chunks():
#             response_stream = client.models.generate_content_stream(
#                 model="gemini-2.5-flash",
#                 contents=[
#                     full_prompt,
#                     types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
#                 ]
#             )
#             for chunk in response_stream:
#                 if chunk.text:
#                     yield chunk.text

#         return StreamingResponse(generate_chunks(), media_type="text/plain")
#     except Exception as e:
#         print(f"STREAM ANALYZE ERROR: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

# @app.post("/analyze")
# async def analyze_screenshot(payload: AnalyzeRequest):
#     """Analyze screenshot using Gemini 2.5 Flash Vision."""
#     if not payload.image:
#         raise HTTPException(status_code=400, detail="No image data received")

#     try:
#         image_bytes, mime_type = clean_base64_image(payload.image)
#         prompt = f"You are Pixel, a helpful AI assistant. {payload.prompt}"

#         response = client.models.generate_content(
#             model="gemini-2.5-flash",
#             contents=[
#                 prompt,
#                 types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
#             ]
#         )

#         return {"text": response.text, "method": "Gemini Vision"}
#     except Exception as e:
#         print(f"ANALYZE ERROR: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

# @app.post("/chat")
# async def chat_interaction(payload: ChatRequest):
#     """Multi-turn contextual chat answering follow-ups about the analyzed screenshot."""
#     if not payload.message:
#         raise HTTPException(status_code=400, detail="No message provided")

#     try:
#         system_instruction = (
#             f'You are Pixel, a helpful AI assistant. You already analyzed a screenshot '
#             f'and this was your finding: "{payload.analysis}". '
#             f'Answer follow-up questions concisely based on this context.'
#         )

#         contents: List[types.Content] = []
#         found_user = False

#         if payload.history:
#             for msg in payload.history:
#                 role = "model" if msg.role in ["model", "assistant"] else "user"
#                 if role == "user":
#                     found_user = True
#                 if found_user:
#                     contents.append(
#                         types.Content(
#                             role=role,
#                             parts=[types.Part.from_text(text=msg.text)]
#                         )
#                     )

#         contents.append(
#             types.Content(
#                 role="user",
#                 parts=[types.Part.from_text(text=payload.message)]
#             )
#         )

#         response = client.models.generate_content(
#             model="gemini-2.5-flash",
#             contents=contents,
#             config=types.GenerateContentConfig(
#                 system_instruction=system_instruction
#             )
#         )

#         return {"text": response.text}
#     except Exception as e:
#         print(f"CHAT ERROR: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

# @app.post("/ocr")
# async def extract_ocr(payload: OCRRequest):
#     """Extract all text directly from an image using EasyOCR with optional AI summary."""
#     if not payload.image:
#         raise HTTPException(status_code=400, detail="No image data received")

#     try:
#         image_bytes, _ = clean_base64_image(payload.image)
#         reader = get_ocr_reader()
#         lines = reader.readtext(image_bytes, detail=0)
#         full_text = "\n".join(lines)

#         ai_summary = None
#         if payload.with_ai_summary and full_text.strip():
#             summary_response = client.models.generate_content(
#                 model="gemini-2.5-flash",
#                 contents=f"You are Pixel. Summarize this extracted text concisely:\n\n{full_text}"
#             )
#             ai_summary = summary_response.text

#         return {
#             "lines": lines,
#             "text": full_text,
#             "summary": ai_summary
#         }
#     except Exception as e:
#         print(f"OCR ERROR: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

# if __name__ == "__main__":
#     import uvicorn
#     print("🚀 Pixel Brain is live on port 5001")
#     uvicorn.run("main:app", host="0.0.0.0", port=5001, reload=True)






#new code , for the latest degin 


import os
import sys
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai import types

sys.path.append(str(Path(__file__).resolve().parent))
from functions.screenshot import screenshot
from functions.splliting_img import splitnsave
from functions.redaction import redact_info
from functions.graph_store import GraphStore
from ai.vector_store import VectorStore
from ai.model_processor import read_text_from_file
from ai.model_processor import ocr_img





load_dotenv()

#intialising gemini api 
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("⚠️ WARNING: GEMINI_API_KEY not found in .env!")


client = genai.Client(api_key=GEMINI_API_KEY)
graph_store = GraphStore("pixel_graph.db") 
vector_store = VectorStore()  

#setting uo the fastapi client 
app = FastAPI(
    title="Pixel AI Brain",
    description="scrnshot and learn with ai",
    version="2.0.0"
)
#cors config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChaRequest(BaseModel):
    message: str #wht th euse asked...                                
    parent_node_id: Optional[str] = None

class CaptureRequest(BaseModel):
    image: str                                   # Base64 string or file path
    prompt: Optional[str] = None                 # Optional question about the screen
    project_name: Optional[str] = None           # Optional project name override
    parent_node_id: Optional[str] = None         # Optional branch parent




@app.get('/')
def root():
    'just health check on this route...'
    return {
        "status": "online",
        "app": "Pixel AI Brain",
        "version": "2.0.0"
    }


@app.post("/capture")
def capture_screen(req: CaptureRequest):
    'this function is to capture the scren and process it , read it , bisect it send to all the ai models and let it learn'

    pil_image=screenshot(req.image)
    split_data=splitnsave(pil_image)
    #taking parts of the split image 
    tab_file=split_data['tab_bar_file']
    viewport_file=split_data['viewport_file']
    diagram_crops = split_data["diagram_crops"]

#processingt he tabs context
    raw_tabs=ocr_img(tab_file)
    detected_tabs = [line.strip() for line in raw_tabs.split("\n") if len(line.strip()) > 2]
    active_project = req.project_name or "General Workspace"
    for t in detected_tabs:
        if any(k in t.lower() for k in ["github", "localhost", "pixel", "vscode", "stripe"]):
            active_project = t.split("-")[0].strip()
            break


#processing th viewport images 
    raw_code = ocr_img(viewport_file)
    safe_code = redact_info(raw_code)

#saving the above data ot sqlite ifor a context 

    proj_id = f"proj_{active_project.lower().replace(' ', '_')}"
    proj_node = graph_store.add_node(
            node_type="project",
            title=f"Project: {active_project}",
            node_id=proj_id
        )
    screen_node = graph_store.add_node(
            node_type="screen",
            title=f"Screen: {active_project} ({len(diagram_crops)} diagrams)",
            content=safe_code[:300] if safe_code else "No code extracted",
            parent_id=req.parent_node_id or proj_node.id,
            meta={
                "tabs": detected_tabs,
                "project": active_project,
                "diagram_count": len(diagram_crops),
                "full_code": safe_code
            }
        )
    graph_store.add_edge(screen_node.id, proj_node.id, "belongs_to_project")


@app.post('/chat')
def chat_endpoint():
    ''


@app.get("/graph")
def get_graph():
    ''