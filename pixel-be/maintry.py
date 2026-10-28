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

from smartroutedetection import is_diagram_image
from hidingsecrets import redact_sensitive_data

warnings.filterwarnings("ignore", category=UserWarning)

load_dotenv()

FALLBACK_MODELS = [
    "gemini-2.5-flash",    # Primary (Tier 1)
    "gemini-2.0-flash",    # Backup 1 (Tier 2)
    "gemini-1.5-flash",    # Backup 2 (Tier 3)
]
# # can add other models like openai , claude etc.


for model in FALLBACK_MODELS:
    try:
        llm = ChatGoogleGenerativeAI(
            model=model,
            google_api_key=os.getenv("GEMINI_API_KEY")
        )
        print(f"Successfully initialized:{model}")
        break
    except Exception as e:
        print(f" Failed to initialize with {model}: {e}")
        continue

else:
    raise RuntimeError("check api key s, couldnt load models")


# reader = easyocr.Reader(['en'])
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://screengrabber.netlify.app", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Input(BaseModel):
    image: str 
    prompt:str


@app.get("/")
def root():
    print("server up and running")
    return {"status": "ok", "message": "server up and running"}


@app.get("/analyse")
async def analyse(data:Input):
    print("initialised /analyse route")
    print(f"got data with prompt: {data.prompt}")
#need to convert the image to base 64 vth both the ways , ocr and gemini vision
    base64_img=data.image.split(",")[-1]
    image_bytes = base64.b64decode(base64_img)
    print(f"Imag converted to base64:{image_bytes}")

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
                    "text": (
                        "You are Pixel, a helpful AI assistant and senior software engineer. "
                        "Describe what you see in this screenshot, summarize any UI components, architecture, "
                        "or workflow diagrams, and suggest optimal solutions or advice."
                    )
                },
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/png;base64,{base64_img}"}
                }, 
                {"type": "text", "text": f"User Request: {data.prompt}"}
            ]
        )
        print("🤖 Calling AI with Gemini Vision...")
        response = await llm.ainvoke([message])

        print(f"received the response from gemini vision:{response}")
        return {"response":response}
    
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

        secured_text=redact_sensitive_data(full_text)
        print(f"ocr extrated the text after redaction:{secured_text}")


        #call the AI here , fro the extreacted text and the prompt

        message = HumanMessage(
            content=[
                {
                    "type": "text", 
                    "text": (
                        "You are Pixel, a helpful AI assistant and senior software engineer. "
                        "Analyze the following code/text extracted from the user's screenshot, "
                        "explain errors or logic, and provide actionable fixes."
                    )
                },
                {"type": "text", "text": f"User Prompt: {data.prompt}"},
                {"type": "text", "text": f"Extracted Text:\n```\n{secured_text}\n```"}
            ]
        )
        print("callling ai for OCR:")
        response = await llm.ainvoke([message])

        print(f"received the response from OCR:{response}")
        return {"response":response}








    

