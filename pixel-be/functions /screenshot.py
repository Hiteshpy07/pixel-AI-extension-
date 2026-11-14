import io 
import base64
from PIL import Image, ImageGrab
from typing import Union

def screenshot(image_input : Union[str, bytes, None] = None):
    ''' this function has a simpler. ,wrok to just piplein the screenshot image grabbed , convert it in to base64 and pass it to the main function for furnther tasks'''
    