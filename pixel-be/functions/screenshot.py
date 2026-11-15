import io 
import base64
from PIL import Image, ImageGrab
from typing import Union

def screenshot(image_input : Union[str, bytes, None] = None):
    # we have three options of image input ehre- image file name(string), base64(string) or bytes data(bytes datatyep)
    ''' this function has a simpler. ,wrok to just piplein the screenshot image grabbed , convert it in to base64 and pass it to the main function for furnther tasks'''
    if image_input == None:
        image=ImageGrab.grab()
        print('screenshot taken')
        return image.convert('RGB')


    if type(image_input)==str and not image_input.startswith("data:"):
        #means str-->base64 or file name , not data:----- means it sis not a base64 data , it sis surely a file name stored inmy local
        print("iuts a localfile on my disk")
        try:
            pil_img = Image.open(image_input).convert("RGB")
            print(f"Loaded screenshot from file: {image_input} ({pil_img.size[0]}x{pil_img.size[1]})")
            return pil_img
        except Exception:
            pass

    elif type(image_input)==str and image_input.startswith("data:"):
        #surely is is a base64 data of a image
        print("its a base64 image passed")
        base64_str = image_input.split(",")[-1]
        image_bytes = base64.b64decode(base64_str)
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        print(f"Decoded Base64 screenshot: ({pil_img.size[0]}x{pil_img.size[1]})")
        return pil_img


    else:
        #it will be image bytes
        print("its a image bytes")
        pil_img = Image.open(io.BytesIO(image_input)).convert("RGB")
        print(f"Loaded screenshot from bytes: ({pil_img.size[0]}x{pil_img.size[1]})")
        return pil_img
    
    raise ValueError(f"image input type not supported: {type(image_input)}")



    


