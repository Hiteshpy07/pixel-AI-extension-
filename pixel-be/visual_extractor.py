import cv2
import numpy as np
from PIL import Image
from dataclasses import dataclass
from typing import List, Tuple


@dataclass
class VisualRegion:
    crop_id: str
    page_number: int
    image: Image.Image
    bbox: Tuple[int, int, int, int]  # (x, y, w, h)
    area: float
    confidence_label: str


class VisualExtractor:
    """
    OpenCV Visual Branch:
    Detects and crops flowcharts, diagrams, architectures, and UI cards 
    from screenshots and viewport images while ignoring standard small text lines.
    """

    def __init__(
        self,
        min_area: int = 10000,
        max_area_ratio: float = 0.92,
        min_width: int = 100,
        min_height: int = 80,
        padding: int = 15
    ):
        self.min_area = min_area
        self.max_area_ratio = max_area_ratio
        self.min_width = min_width
        self.min_height = min_height
        self.padding = padding

    def extract_regions(self, pil_image: Image.Image, page_number: int = 1) -> List[VisualRegion]:
        rgb_arr = np.array(pil_image)
        if len(rgb_arr.shape) == 2:
            gray = rgb_arr
            bgr_arr = cv2.cvtColor(rgb_arr, cv2.COLOR_GRAY2BGR)
        else:
            bgr_arr = cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(bgr_arr, cv2.COLOR_BGR2GRAY)

        img_h, img_w = gray.shape[:2]
        max_allowed_area = img_h * img_w * self.max_area_ratio

        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        thresh = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV, 25, 10
        )

        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (17, 17))
        dilated = cv2.dilate(thresh, kernel, iterations=2)

        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        regions: List[VisualRegion] = []
        crop_counter = 0

        for c in contours:
            area = cv2.contourArea(c)
            x, y, w, h = cv2.boundingRect(c)

            aspect_ratio = float(w) / max(h, 1)
            is_valid_size = (self.min_area < area < max_allowed_area) and (w >= self.min_width) and (h >= self.min_height)
            is_not_text_line = (0.15 <= aspect_ratio <= 6.0)

            if is_valid_size and is_not_text_line:
                crop_counter += 1
                
                pad_x1 = max(0, x - self.padding)
                pad_y1 = max(0, y - self.padding)
                pad_x2 = min(img_w, x + w + self.padding)
                pad_y2 = min(img_h, y + h + self.padding)

                cropped_rgb = rgb_arr[pad_y1:pad_y2, pad_x1:pad_x2]
                cropped_pil = Image.fromarray(cropped_rgb)

                label = "diagram_or_ui"
                if w > h * 1.5:
                    label = "horizontal_flowchart_or_banner"
                elif h > w * 1.5:
                    label = "vertical_process_diagram"

                regions.append(VisualRegion(
                    crop_id=f"screen_{page_number}_crop_{crop_counter}",
                    page_number=page_number,
                    image=cropped_pil,
                    bbox=(pad_x1, pad_y1, pad_x2 - pad_x1, pad_y2 - pad_y1),
                    area=area,
                    confidence_label=label
                ))

        regions.sort(key=lambda r: r.bbox[1])
        return regions
