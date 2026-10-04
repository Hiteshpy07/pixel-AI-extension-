import cv2
import numpy as np

def is_diagram_image(image_bytes: bytes) -> bool:
    # 1. Convert raw bytes into an OpenCV image matrix in RAM
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)

    if img is None:
        return True  # If corrupted or unknown, default to Gemini Vision as safety

    # 2. Canny Edge Detection (Finds all outlines and shapes)
    edges = cv2.Canny(img, threshold1=50, threshold2=150)

    # 3. Find Contours (Continuous geometric shapes)
    contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    # Filter out tiny contours (letters) and count only LARGE shapes (boxes, arrows, cards)
    # A letter like 'A' or 'o' has an area of < 100 pixels.
    # A flowchart box or UI container has an area > 500 pixels.
    large_shapes = [c for c in contours if cv2.contourArea(c) > 500]

    print(f"🔍 Shape Detection: Found {len(large_shapes)} large geometric shapes.")

    # If there are 4 or more large geometric blocks/boxes, it's a diagram!
    if len(large_shapes) >= 4:
        return True
    
    return False
