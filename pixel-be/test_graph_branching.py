import io
import cv2
import numpy as np
from PIL import Image
from graph_store import GraphStore
from screen_analyzer import ScreenAnalyzer

def test_screen_analyzer_and_branching():
    print("🧪 Running Screen Analyzer & Obsidian Branching Graph Test...\n")

    img = np.ones((600, 800, 3), dtype=np.uint8) * 255
    cv2.rectangle(img, (0, 0), (800, 60), (220, 220, 220), -1)
    cv2.rectangle(img, (150, 150), (450, 400), (40, 40, 40), 2)
    cv2.circle(img, (300, 275), 45, (10, 10, 200), 2)

    pil_img = Image.fromarray(img)
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    raw_bytes = buf.getvalue()

    analyzer = ScreenAnalyzer()
    result = analyzer.analyze_screenshot(raw_bytes, screen_id="test_screen_1", user_project_hint="Pixel-BE")
    print(f"✅ Detected Project: {result.active_project}")
    print(f"✅ Diagram crops identified: {len(result.diagram_crops)}")

    store = GraphStore(":memory:")
    proj = store.add_node("project", "Project: Pixel-BE")
    screen = store.add_node("screen", "Screen Capture 1", parent_id=proj.id)
    branch_a = store.add_node("chat_message", "Branch A: Debug Error", parent_id=screen.id)
    sub_a = store.add_node("chat_message", "Branch A.1: Fix details", parent_id=branch_a.id)
    branch_b = store.add_node("chat_message", "Branch B: Refactor in TS", parent_id=screen.id)

    lineage_a = store.get_branch_history(sub_a.id)
    lineage_titles = [n.title for n in lineage_a]
    print(f"✅ Lineage A Chain: {lineage_titles}")
    assert "Branch B: Refactor in TS" not in lineage_titles, "Crosstalk detected between branches!"

    graph = store.get_graph_data()
    print(f"✅ Total Obsidian Graph Nodes: {len(graph['nodes'])}")
    print(f"✅ Total Obsidian Graph Links: {len(graph['links'])}")

    print("\n🎉 ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_screen_analyzer_and_branching()
