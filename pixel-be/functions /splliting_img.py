import os
from PIL import Image
from typing import Dict, Any,Union
from visual_extractor import VisualExtractor

def splitnsave(
    #parameters
    image:Union[str, Image.Image],#we are getting Image.Image format from screenshot.py adnn str for in case usage
    output_dir:str='temp_images',
    tab_height:int=70 #as suggested by ai 
):
    '''this function basiclaly functions like , it that the image from screenshot.py file , split it into images text , and split the tabs out and store them into tem file 
    so that i scan be used properly and cantext can be built '''

    if not image:
        raise ValueError("image_input is required")
    
    os.makdirs(output_dir, exist_ok=True)#create the director , if  there , its ok
    width, height = image.size
    print(f"📐 Original screenshot dimensions: {width}x{height}")
    

    #now we will splitt the tabs from the whole screen
    if height > tab_height * 2:
        # crop format is (left, top, right, bottom)
        tab_bar_img = image.crop((0, 0, width, tab_height))
        viewport_img = image.crop((0, tab_height, width, height))
    else:
        # If image is very small, treat everything as viewport
        tab_bar_img = None
        viewport_img = image

     #Save the Tab Bar slice to a temp file
    tab_bar_path = None
    if tab_bar_img:
        tab_bar_path = os.path.join(output_dir, "tab_bar.png")
        tab_bar_img.save(tab_bar_path)
        print(f"Saved Tab Bar to: {tab_bar_path}")
    #Save the Viewport slice to a temp file
    viewport_path = os.path.join(output_dir, "viewport.png")
    viewport_img.save(viewport_path)
    print(f"Saved Viewport to: {viewport_path}")


    #using the detection logic eritten already in bisual_extractor
    extractor = VisualExtractor(min_area=8000)
    diagram_regions = extractor.extract_regions(viewport_img)


    #saving them.....
    saved_diagrams=[ ]

    for i,region in enumerate(diagram_regions , start=1):
        #here i is the image no, or the iteration no , and regiion is the object coming from the visual extractor wich contain the diangram image
        diagram_name=f"diagram{i}.png"
        diagram_path=os.path.join(output_dir,diagram_name)
        region.image.save(diagram_path)
        print(f"🖼️ Saved Diagram Crop {i} to: {diagram_path}")


        saved_diagrams.append({
            "crop_id": region.crop_id,
            "file_path": diagram_path,
            "label": region.confidence_label,
            "bbox": region.bbox,
            "area": region.area
        })#this is to keep a track of all the files and their info to use later


    return{
        "status": "success",
        "tab_bar_file": tab_bar_path,
        "viewport_file": viewport_path,
        "diagram_crops": saved_diagrams,
        "total_diagrams": len(saved_diagrams)
    }

    #whole summary of what the function did , need to use it ltter , contains all the output variuables

        




    
  