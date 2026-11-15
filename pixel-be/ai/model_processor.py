import os 
import sys
from pathlib import Path
import base64
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types

# from functions.screenshot import screenshot
# from functions.splliting_img import splitnsave 

sys.path.append(str(Path(__file__).resolve().parent.parent))#whats this in for ????
from functions.screenshot import screenshot
from functions.splliting_img import splitnsave
from functions.redaction import redact_info

_ocr_reader = None
#lazy loading easyoce model , rs=ead more about it 
def get_ocr():
    global _ocr_reader
    if _ocr_reader is None:
        import easyocr
        _ocr_reader = easyocr.Reader(['en'])
    return _ocr_reader

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)

def ocr_img(image_path: Optional[str]):
    '''its basically just jake s the image oath input and ocr the , fully local'''
    if not image_path or os.path.exists(image_path):
        return ""
        #a cute fallback 
    try:
        reader= get_ocr()
        lines = reader.readtext(image_path, detail=0)
        return "\n".join(lines)
        #here , ocr taking placeeeeee

    except Exception as e:
        print(f"⚠️ OCR warning for {image_path}: {e}")
        return ""
        #ocr =failed

#ocr karrnekeliye , made a diff ans it is occuring local , will call the ai mdoel direct in the  send_to_model function

def send_to_model():
    '''this is a fuinction to sendall the saved images(tabs , viewport , diagrams ) to respective 
    models and extract the response from them'''






