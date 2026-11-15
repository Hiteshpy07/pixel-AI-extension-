from multiprocessing.spawn import import_main_path
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



#master function 
def send_to_model(
    img_input:Optional[str,bytes, None],
    user_prompt:str="Analyze this screen. Explain the code, diagnose any errors, and describe the diagrams."
)->Dict[str,Any]:

 # the values we will get. out iof this fucntion will be strictly  dICT

    '''this is a fuinction to sendall the saved images(tabs , viewport , diagrams ) to respective 
    models and extract the response from them'''

    """
    Connects:
    1. screenshot() -> in-memory image
    2. splitnsave() -> tab_bar.png, viewport.png, diagram crops
    3. OCR on tab_bar -> open tabs & project detection
    4. OCR on viewport -> redact_info() for secrets
    5. Gemini 2.5 Flash -> multimodal reasoning
    """


    print("Grabbing screnshots")
    pil_img=screenshot(img_input)

    print('splitting the screenshots')
    splitdata=splitnsave(pil_img)
    tabfile=splitdata['tab_bar_file']
    viewport=splitdata['viewport_file']
    diagram_crops = splitdata["diagram_crops"]
    #now we have all our images ready , we got is from splitting_img.py , check its return statemen

    print("OCRing the images...")


    open_tabs_text=ocr_img(tabfile)
    # print("open tabs text...: ", open_tabs_text)

    detected_tabs = [line.strip() for line in open_tabs_text.split("\n") if len(line.strip()) > 2]
    #coolest and cleanst way to process the text 

    viewport_text = ocr_img(viewport)

    if viewport_text:
        viewport_text = redact_info(viewport_text)
        print("REDACTED_VIEWPORT:", viewport_text[:150] + "...")
    else:
        print("WARNING: Viewport OCR failed → falling back to model with no visual contex")

# lets keep a trract of the ongoing projetc or something import_main_path
# also this part can be usse for futrure featirs liek adding ,multi tab functions 

    active_project=''
    for t in detected_tabs :
        if 'project' in t.lower():
            if any(keyword in t.lower() for keyword in ["github", "localhost", "pixel", "vscode", "stripe"]):
                active_project = t.split("-")[0].strip()
            break
    print(f"📂 Detected Project: {active_project}")


    # can modify the list of required and tabs intrested in to pass the context to ai 



    # most importyan part-PROMPTTTTTTT
    contents = [] #to keep the meoory

    # Prompt text with clean code & tab context
    prompt_message = (
        f"You are Pixel, a senior software engineer and AI screen companion.\n"
        f"Active Project: {active_project}\n"
        f"Open Browser Tabs: {detected_tabs}\n\n"
        f"--- USER REQUEST ---\n{user_prompt}\n\n"
        f"--- EXTRACTED CODE & TERMINAL LOGS ---\n```\n{viewport_text}\n```\n"
    )
    contents.append(prompt_message)

    #can also pass the diagrams to the prompt for context
    for crop in diagram_crops:
        crop_path = crop["file_path"]
        if os.path.exists(crop_path):
            with open(crop_path, "rb") as f:
                img_bytes = f.read()

    contents.append(types.Part.from_bytes(data=img_bytes, mime_type="image/png"))
    print(f"Attached diagram crop: {crop_path}")


    #send everything to gemini nowwwwww
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=contents
    )
    print("\n✅ Response received from Gemini Flash!")
    return {
        "status": "success",
        "active_project": active_project,
        "detected_tabs": detected_tabs,
        "diagrams_count": len(diagram_crops),
        "redacted_code": viewport_text,
        "ai_response": response.text
    }


            
        

if __name__ == "__main__":
    result = send_to_model()
    print("\n================= AI RESPONSE =================")
    print(result["ai_response"])






