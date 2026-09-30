import os
import base64
import easyocr
import warnings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

warnings.filterwarnings("ignore", category=UserWarning)

load_dotenv()

# Initialize Gemini & EasyOCR Reader
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.getenv("GEMINI_API_KEY")
)
reader = easyocr.Reader(['en'])

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://screengrabber.netlify.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Screenshot(BaseModel):
    image: str    

@app.get("/")
def root():
    return {"message": "Hello World"}        

# --- METHOD 1: EasyOCR ---
@app.post("/ocr-img")
def ocrmypic(data: Screenshot):
    base64_str = data.image.split(",")[-1]
    image_bytes = base64.b64decode(base64_str)
    lines = reader.readtext(image_bytes, detail=0)
    full_text = "\n".join(lines)
    return {
        "method": "EasyOCR",
        "extracted_lines": lines,
        "text": full_text
    }

# --- METHOD 2: Gemini Vision with LangChain ---
@app.post("/base64-img-converstion")
async def base64mypic(data: Screenshot):
    base64_str = data.image.split(",")[-1]

    message = HumanMessage(
        content=[
            {"type": "text", "text": "You are Pixel, a helpful AI assistant. Describe what you see in this screenshot and summarize any text or code:"},
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{base64_str}"}
            }
        ]
    )
    
    response = await llm.ainvoke([message])
    return {
        "method": "Gemini Vision (LangChain)",
        "text": response.content
    }