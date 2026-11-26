import os
import time
import shutil
import cv2
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# ---------------------------------------------------------------------------
# Step 0: Ensure we have an input image
# ---------------------------------------------------------------------------
raw_img_path = "real_test.png"
if not os.path.exists(raw_img_path):
    # Try looking in parent directory
    sample_source = os.path.join(os.path.dirname(os.getcwd()), "real_test.png")
    if os.path.exists(sample_source):
        print(f"📋 Copying sample image from {sample_source} -> {raw_img_path}")
        shutil.copy(sample_source, raw_img_path)
    else:
        raise FileNotFoundError("Could not find real_test.png!")

img = cv2.imread(raw_img_path)
if img is None:
    raise ValueError(f"Failed to load image from {raw_img_path}")

h, w, _ = img.shape
print(f"🖼️ Input image loaded: {raw_img_path} ({w}x{h} px)")

# ---------------------------------------------------------------------------
# Step 1: Highlight top 70px slice for visual demo
# ---------------------------------------------------------------------------
slice_y = min(70, int(h * 0.1))
highlighted = img.copy()
cv2.rectangle(highlighted, (0, 0), (w, slice_y), (0, 255, 255), 4)
cv2.imwrite("01_slice_highlight.png", highlighted)
print("  ✅ Saved: 01_slice_highlight.png")

# ---------------------------------------------------------------------------
# Step 2: Viewport Slicing & Adaptive Thresholding
# ---------------------------------------------------------------------------
viewport = img[slice_y:, :]
gray = cv2.cvtColor(viewport, cv2.COLOR_BGR2GRAY)
thresh = cv2.adaptiveThreshold(
    gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2
)
cv2.imwrite("02_thresh.png", thresh)
print("  ✅ Saved: 02_thresh.png")

# ---------------------------------------------------------------------------
# Step 3: Morphological Dilation
# ---------------------------------------------------------------------------
kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (17, 17))
dilated = cv2.dilate(thresh, kernel, iterations=1)
cv2.imwrite("03_dilated.png", dilated)
print("  ✅ Saved: 03_dilated.png")

# ---------------------------------------------------------------------------
# Step 4: Contours & Diagram Bounding Box Extraction
# ---------------------------------------------------------------------------
contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
boxed = viewport.copy()

crops = []
for i, c in enumerate(contours):
    x, y, cw, ch = cv2.boundingRect(c)
    if cw * ch > 15000:
        cv2.rectangle(boxed, (x, y), (x + cw, y + ch), (0, 255, 0), 4)
        crop = viewport[y:y + ch, x:x + cw]
        crop_filename = f"05_final_crop_{len(crops)}.png"
        cv2.imwrite(crop_filename, crop)
        crops.append(crop_filename)

cv2.imwrite("04_bounding_boxes.png", boxed)
print("  ✅ Saved: 04_bounding_boxes.png")
print(f"  ✅ Saved {len(crops)} diagram crops (e.g. 05_final_crop_0.png)")

# Fallback if no contours met threshold: use entire viewport
if not crops:
    fallback_crop = "05_final_crop_0.png"
    cv2.imwrite(fallback_crop, viewport)
    crops.append(fallback_crop)

crop_path = crops[0]

# ---------------------------------------------------------------------------
# Step 5: Gemini 2.5 Flash Benchmark Comparison
# ---------------------------------------------------------------------------
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("⚠️ GEMINI_API_KEY not found in .env; skipping API benchmark call.")
    exit(0)

client = genai.Client(api_key=api_key)

def benchmark(path: str, label: str):
    size_kb = os.path.getsize(path) / 1024
    with open(path, "rb") as f:
        img_bytes = f.read()

    t0 = time.perf_counter()
    res = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            types.Part.from_bytes(data=img_bytes, mime_type="image/png"),
            "Explain this architecture diagram briefly in 2 sentences."
        ]
    )
    latency = time.perf_counter() - t0
    tokens = res.usage_metadata.prompt_token_count if res.usage_metadata else 0
    return {
        "label": label,
        "path": path,
        "size_kb": size_kb,
        "latency": latency,
        "tokens": tokens,
        "response": res.text.strip()
    }

print("\n⏱️ Running Gemini 2.5 Flash Benchmark...")
print("  Calling with raw_screen.png...")
raw_result = benchmark(raw_img_path, "Raw Full Screen")

print(f"  Calling with {crop_path}...")
crop_result = benchmark(crop_path, "OpenCV Cropped Diagram")

# ---------------------------------------------------------------------------
# Step 6: Print Benchmark Results Table
# ---------------------------------------------------------------------------
token_saved = ((raw_result["tokens"] - crop_result["tokens"]) / raw_result["tokens"]) * 100 if raw_result["tokens"] else 0
size_saved = ((raw_result["size_kb"] - crop_result["size_kb"]) / raw_result["size_kb"]) * 100
speedup = ((raw_result["latency"] - crop_result["latency"]) / raw_result["latency"]) * 100 if raw_result["latency"] > crop_result["latency"] else 0

print("\n" + "=" * 65)
print(" 🚀 BENCHMARK RESULTS (Gemini 2.5 Flash Multimodal)")
print("=" * 65)
print(f"{'Metric':<22} | {'Raw Full Screen':<18} | {'OpenCV Crop':<18}")
print("-" * 65)
print(f"{'Image File':<22} | {raw_result['path']:<18} | {crop_result['path']:<18}")
print(f"{'Payload Size':<22} | {raw_result['size_kb']:<15.1f} KB | {crop_result['size_kb']:<15.1f} KB")
print(f"{'Prompt Tokens':<22} | {raw_result['tokens']:<18} | {crop_result['tokens']:<18}")
print(f"{'API Latency':<22} | {raw_result['latency']:<15.2f} s  | {crop_result['latency']:<15.2f} s")
print("=" * 65)
print(f"💥 Token Reduction : {token_saved:.1f}%")
print(f"📦 Payload Reduction: {size_saved:.1f}%")
print("=" * 65)
print(f"\nAI Output for Cropped Diagram:\n\"{crop_result['response'][:200]}...\"\n")
