from email import message
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

class Input(BaseModel):
    image: str 
    prompt:str

@app.get("/")
def root():
    return {"message": "Hello World"}        

# --- METHOD 1: EasyOCR ---
@app.post("/ocr-img")
def ocrmypic(data: Input):
    base64_str = data.image.split(",")[-1]
    image_bytes = base64.b64decode(base64_str)
    lines = reader.readtext(image_bytes, detail=0)
    full_text = "\n".join(lines)

    message=HumanMessage(
        content=[
            {"type":"text","text":"You are Pixel, a helpful AI assistant. Describe what you see in this screenshot and summarize any text or code:, also attched the propt entered bny the end user , suggest the ways to solve it or adive as a senior softwatre engineer "},
            {"type":"text" ,"text":full_text},
            {"type": "text", "text": data.prompt}
        ]
    )

    response = llm.invoke([message])
    return {
        "method": "EasyOCR",
        "extracted_lines": lines,
        "text": response.content
    }


# --- METHOD 2: Gemini Vision with LangChain ---
@app.post("/base64-img-converstion")
async def base64mypic(data: Input):
    base64_str = data.image.split(",")[-1]

    message = HumanMessage(
        content=[
            {"type": "text", "text": "You are Pixel, a helpful AI assistant. Describe what you see in this screenshot and summarize any text or code:, also attched the propt entered bny the end user , suggest the ways to solve it or adive as a senior softwatre engineer "},
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{base64_str}"}
            },
            {"type": "text", "text": data.prompt}
        ]
    )
    
    response = await llm.ainvoke([message])
    return {
        "method": "Gemini Vision (LangChain)",
        "text": response.content
    }

