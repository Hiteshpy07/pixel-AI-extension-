import os
from PIL import Image
from typing import Dict, Any,Union
from visual_extractor import VisualExtractor

def splitnsave(
    #parameters
    image_input:Union[str, Image.Image],#we are getting Image.Image format from screenshot.py adnn str for in case usage
    output_dir:str='temp_images',
    tab_height:int=70 #as suggested by ai 
):
    '''this function basiclaly functions like , it that the image from screenshot.py file , split it into images text , and split the tabs out and store them into tem file 
    so that i scan be used properly and cantext can be built '''

