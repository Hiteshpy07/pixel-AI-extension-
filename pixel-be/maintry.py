from email import message
import os
import base64

# import easyocr
import cv2
import numpy as np
import indra_ocr

import warnings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

# pyrefly: ignore [missing-import]
from smartroutedetection import is_diagram_image

# for smart chocie , ocr or gemini vision 
# ocr for only text things and gemini for text and images both

warnings.filterwarnings("ignore", category=UserWarning)

load_dotenv()

# FALLBACK_MODELS = [
#     "gemini-2.5-flash",    # Primary (Tier 1)
#     "gemini-2.0-flash",    # Backup 1 (Tier 2)
#     "gemini-1.5-flash",    # Backup 2 (Tier 3)
# ]
# # can add other models like openai , claude etc.


# for model in FALLBACK_MODELS:
#     try:
#         llm = ChatGoogleGenerativeAI(
#             model=model,
#             google_api_key=os.getenv("GEMINI_API_KEY")
#         )
#         print(f"Successfully initialized:{model}")
#         break
#     except Exception as e:
#         print(f" Failed to initialize with {model}: {e}")
#         continue

# else:
#     raise RuntimeError("check api key s, couldnt load models")


# reader = easyocr.Reader(['en'])
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


# @app.get("/")
# def root():
#     return {"message": "Server up and running"}        

# # --- METHOD 1: EasyOCR ---
# @app.post("/ocr-img")
# async def ocrmypic(data: Input):
#     base64_str = data.image.split(",")[-1]
#     image_bytes = base64.b64decode(base64_str)
#     lines = reader.readtext(image_bytes, detail=0)
#     full_text = "\n".join(lines)

#     message=HumanMessage(
#         content=[
#             {"type":"text","text":"You are Pixel, a helpful AI assistant. Describe what you see in this screenshot and summarize any text or code:, also attched the propt entered bny the end user , suggest the ways to solve it or adive as a senior softwatre engineer "},
#             {"type":"text" ,"text":full_text},
#             {"type": "text", "text": data.prompt}
#         ]
#     )

#     response = await llm.ainvoke([message])
#     tokens = getattr(response, "usage_metadata", None) or {}
#     return {
#         "method": "EasyOCR",
#         "extracted_lines": lines,
#         "text": response.content,
#         "model_tokens": {
#             "input_tokens": tokens.get("input_tokens"),
#             "output_tokens": tokens.get("output_tokens"),
#             "total_tokens": tokens.get("total_tokens")
#         }
#     }


# # --- METHOD 2: Gemini Vision with LangChain ---
# @app.post("/base64-img-converstion")
# async def base64mypic(data: Input):
#     base64_str = data.image.split(",")[-1]

#     message = HumanMessage(
#         content=[
#             {"type": "text", "text": "You are Pixel, a helpful AI assistant. Describe what you see in this screenshot and summarize any text or code:, also attched the propt entered bny the end user , suggest the ways to solve it or adive as a senior softwatre engineer "},
#             {
#                 "type": "image_url",
#                 "image_url": {"url": f"data:image/png;base64,{base64_str}"}
#             },
#             {"type": "text", "text": data.prompt}
#         ]
#     )
    
#     response = await llm.ainvoke([message])
#     tokens = getattr(response, "usage_metadata", None) or {}
#     return {
#         "method": "Gemini Vision (LangChain)",
#         "text": response.content,
#          "model_tokens": {
#             "input_tokens": tokens.get("input_tokens"),
#             "output_tokens": tokens.get("output_tokens"),
#             "total_tokens": tokens.get("total_tokens")
#         }
#     }


# @app.post("/smart-route")
# async def smart_route(data:Input):

#     # preprocession of the input image for smart routing 
    
#     base64_img=data.image.split(",")[-1]
#     image_bytes = base64.b64decode(base64_img)


#     is_diagram=is_diagram_image(image_bytes)
#     if is_diagram:
#         print("Diagram detected,using Model vision")
#         await base64mypic(data)
#         return {
#             "route_chosen": "Gemini Vision (Multimodal)",
#             "is_diagram": True
            
#             }
#     else:
#         print("Diagram not detected,using OCR") 
#         await ocrmypic(data)
#         return {
#             "route_chosen": "EasyOCR + Text LLM",
#             "is_diagram": False
#         }


@app.get("/")
def root():
    print("server up and running")
    return {"message": "server up and running"}


@app.get("/analyse")
def analyse(data:Input):
    print("initialised /analyse route")
    print("got data with prompt: {data.prompt}")
#need to convert the image to base 64 vth both the ways , ocr and gemini vision
    base64_img=data.image.split(",")[-1]
    image_bytes = base64.b64decode(base64_img)
    print("Imag converted to base64:{image_bytes}")

    #image-->diagram heavy?gemini vision : OCR
    is_diagram=is_diagram_image(image_bytes)
    if is_diagram:
        print("Diagram detected,using Model vision")
        #gemini vision-diractly calling AI here


#imput messgae to the AI model
        message = HumanMessage(
        content=[
            {
                "type": "text", 
                "text": "You are Pixel, a helpful AI assistant. Describe what you see in this screenshot and summarize any text or code, also attached the prompt entered by the end user, suggest the ways to solve it or advise as a senior software engineer."
            },
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{image_bytes}"}
            },
            {"type": "text", "text": data.prompt}
        ]
    )




    else:
        print("Diagram not detected,using OCR") 
        #OCR-done by indra_ocr module
        conv = indra_ocr.load(threads=4)
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
        page = conv.ocr(gray)
        full_text = page.markdown
        print(f"ocr extrated the text:{full_text}")

        #call the AI here , fro the extreacted text and the prompt










    

