import io 
import base64
from PIL import Image, ImageGrab
from typing import Union

import io
import os
import base64
from PIL import Image, ImageGrab
from typing import Union

def screenshot(image_input: Union[str, bytes, None] = None) -> Image.Image:
    """
    Accepts:
    - None: Live desktop screen capture via ImageGrab
    - File path string: e.g. 'raw_screen.png' or '/path/to/img.png'
    - Data URL string: e.g. 'data:image/png;base64,...'
    - Raw Base64 string: e.g. 'iVBORw0KGgo...'
    - Raw bytes: e.g. b'...'
    Returns a PIL Image in RGB mode.
    """
    if image_input is None:
        img = ImageGrab.grab()
        return img.convert("RGB")

    if isinstance(image_input, bytes):
        return Image.open(io.BytesIO(image_input)).convert("RGB")

    if isinstance(image_input, str):
        # 1. If it's an existing file path on local disk
        if os.path.exists(image_input):
            return Image.open(image_input).convert("RGB")

        # 2. Extract base64 payload if it has data URL prefix
        base64_str = image_input.split(",")[-1] if "," in image_input else image_input

        # 3. Decode Base64 string
        try:
            image_bytes = base64.b64decode(base64_str)
            return Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as e:
            raise ValueError(f"Failed to decode base64 image: {e}")

    raise ValueError(f"Image input type not supported: {type(image_input)}")



    


