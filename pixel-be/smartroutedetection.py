import cv2
import numpy as np

def is_diagram_image(image_bytes: bytes) -> bool:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)

    if img is None:
        return True     

    edges = cv2.Canny(img, threshold1=50, threshold2=150)
    contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    large_shapes = [c for c in contours if cv2.contourArea(c) > 500]
    print(f"Shapes detected , need to use Gemini vision")
    if len(large_shapes) >= 4:
        return True
    return False
