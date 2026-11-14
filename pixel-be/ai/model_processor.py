import os 
import base64
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types


load_dotenv()

def send_to_model():
    '''this is a fuinction to sendall the saved images(tabs , viewport , diagrams ) to respective 
    models and extract the response from them'''
