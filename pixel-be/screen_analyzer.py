import io
import base64
import numpy as np
import cv2
from PIL import Image
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

from visual_extractor import VisualExtractor, VisualRegion
from hidingsecrets import redact_sensitive_data
from document_loader import get_ocr_instance


@dataclass
class ScreenAnalysisResult:
    screen_id: str
    detected_tabs: List[str]
    active_project: str
    code_and_text: str
    diagram_crops: List[VisualRegion]
    meta: Dict[str, Any]


class ScreenAnalyzer:
    def __init__(self, tab_bar_height: int = 70):
        self.tab_bar_height = tab_bar_height
        self.visual_extractor = VisualExtractor(min_area=10000)

    def analyze_screenshot(
        self,
        image_bytes: bytes,
        screen_id: str = "screen_1",
        user_project_hint: Optional[str] = None
    ) -> ScreenAnalysisResult:
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        width, height = pil_img.size

        if height > self.tab_bar_height * 2:
            tab_bar_crop = pil_img.crop((0, 0, width, min(self.tab_bar_height, height)))
            viewport_crop = pil_img.crop((0, min(self.tab_bar_height, height), width, height))
        else:
            tab_bar_crop = None
            viewport_crop = pil_img

        detected_tabs = []
        if tab_bar_crop:
            tab_text = self._extract_text(tab_bar_crop)
            lines = [line.strip() for line in tab_text.split("\n") if len(line.strip()) > 2]
            detected_tabs = lines[:5]

        active_project = user_project_hint or "General Workspace"
        if detected_tabs:
            for t in detected_tabs:
                if any(k in t.lower() for k in ["github", "localhost", "vscode", "pixel", "figma"]):
                    active_project = t.split("-")[0].strip()
                    break

        diagram_crops = self.visual_extractor.extract_regions(viewport_crop)
        raw_text = self._extract_text(viewport_crop)
        secured_text = redact_sensitive_data(raw_text)

        return ScreenAnalysisResult(
            screen_id=screen_id,
            detected_tabs=detected_tabs,
            active_project=active_project,
            code_and_text=secured_text,
            diagram_crops=diagram_crops,
            meta={
                "resolution": f"{width}x{height}",
                "diagram_count": len(diagram_crops),
                "text_char_count": len(secured_text)
            }
        )

    def _extract_text(self, pil_image: Image.Image) -> str:
        try:
            ocr_engine = get_ocr_instance()
            np_arr = np.array(pil_image)

            if len(np_arr.shape) == 3:
                gray = cv2.cvtColor(np_arr, cv2.COLOR_RGB2GRAY)
            else:
                gray = np_arr

            if hasattr(ocr_engine, "ocr"):
                res = ocr_engine.ocr(gray)
                return getattr(res, "markdown", str(res))
            elif hasattr(ocr_engine, "readtext"):
                res = ocr_engine.readtext(np_arr)
                return "\n".join([item[1] for item in res])
            return ""
        except Exception as e:
            print(f"[screen_analyzer] OCR error: {e}")
            return ""
