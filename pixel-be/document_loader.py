import io
from dataclasses import dataclass
from typing import List, Union, Optional
from PIL import Image
import numpy as np
import cv2
import pypdfium2 as pdfium

from hidingsecrets import redact_sensitive_data

_indra_ocr_instance = None

def get_ocr_instance():
    global _indra_ocr_instance
    if _indra_ocr_instance is None:
        try:
            import indra_ocr
            _indra_ocr_instance = indra_ocr.load(threads=4)
        except Exception as e:
            print(f"[document_loader] indra_ocr unavailable, falling back to EasyOCR: {e}")
            import easyocr
            _indra_ocr_instance = easyocr.Reader(['en'])
    return _indra_ocr_instance


@dataclass
class PageDocument:
    page_number: int
    image: Image.Image
    text: str
    source_type: str
    metadata: dict


class DocumentLoader:
    @staticmethod
    def load_pdf(pdf_input: Union[str, bytes], render_scale: float = 2.0) -> List[PageDocument]:
        if isinstance(pdf_input, bytes):
            pdf = pdfium.PdfDocument(pdf_input)
        else:
            pdf = pdfium.PdfDocument(pdf_input)

        pages = []
        for page_idx in range(len(pdf)):
            page = pdf[page_idx]

            textpage = page.get_textpage()
            raw_text = textpage.get_text_range() or ""
            raw_text = raw_text.strip()

            bitmap = page.render(scale=render_scale)
            pil_image = bitmap.to_pil()

            if len(raw_text) >= 50:
                source = "digital_pdf"
                extracted_text = raw_text
            else:
                source = "ocr"
                print(f"[document_loader] Page {page_idx + 1} has insufficient digital text ({len(raw_text)} chars). Running OCR...")
                extracted_text = DocumentLoader._run_ocr_on_image(pil_image)

            secured_text = redact_sensitive_data(extracted_text)

            pages.append(PageDocument(
                page_number=page_idx + 1,
                image=pil_image,
                text=secured_text,
                source_type=source,
                metadata={"char_count": len(secured_text)}
            ))

        return pages

    @staticmethod
    def load_image(image_input: Union[str, bytes, Image.Image]) -> PageDocument:
        if isinstance(image_input, bytes):
            pil_image = Image.open(io.BytesIO(image_input)).convert("RGB")
        elif isinstance(image_input, str):
            pil_image = Image.open(image_input).convert("RGB")
        elif isinstance(image_input, Image.Image):
            pil_image = image_input.convert("RGB")
        else:
            raise ValueError(f"Unsupported image input type: {type(image_input)}")

        ocr_text = DocumentLoader._run_ocr_on_image(pil_image)
        secured_text = redact_sensitive_data(ocr_text)

        return PageDocument(
            page_number=1,
            image=pil_image,
            text=secured_text,
            source_type="ocr",
            metadata={"char_count": len(secured_text)}
        )

    @staticmethod
    def _run_ocr_on_image(pil_image: Image.Image) -> str:
        try:
            ocr_engine = get_ocr_instance()
            np_img = np.array(pil_image)

            if len(np_img.shape) == 3:
                gray = cv2.cvtColor(np_img, cv2.COLOR_RGB2GRAY)
            else:
                gray = np_img

            if hasattr(ocr_engine, "ocr"):
                res = ocr_engine.ocr(gray)
                return getattr(res, "markdown", str(res))
            elif hasattr(ocr_engine, "readtext"):
                results = ocr_engine.readtext(np_img)
                return "\n".join([item[1] for item in results])
            return ""
        except Exception as e:
            print(f"[document_loader] OCR failed: {e}")
            return ""
