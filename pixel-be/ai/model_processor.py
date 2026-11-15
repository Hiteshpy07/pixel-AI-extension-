import os 
import base64
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types

# from functions.screenshot import screenshot
# from functions.splliting_img import splitnsave 


load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)

def send_to_model():
    '''this is a fuinction to sendall the saved images(tabs , viewport , diagrams ) to respective 
    models and extract the response from them'''




