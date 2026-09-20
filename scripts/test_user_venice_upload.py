"""Upload user-provided Venice aerial image to Chakshu AIML engine."""

import io
import json
import urllib.request
from pathlib import Path

img_path = Path("c:/Users/Vanshaj sharma/Desktop/Chakshu/venice_aerial.jpg")
img_bytes = img_path.read_bytes()

boundary = "----WebKitFormBoundaryVeniceUploadTest"
body = bytearray()
body.extend(f"--{boundary}\r\n".encode())
body.extend(b'Content-Disposition: form-data; name="file"; filename="venice_aerial.jpg"\r\n')
body.extend(b"Content-Type: image/jpeg\r\n\r\n")
body.extend(img_bytes)
body.extend(b"\r\n")

body.extend(f"--{boundary}\r\n".encode())
body.extend(b'Content-Disposition: form-data; name="title"\r\n\r\n')
body.extend(b"Venice Lagoon Aerial Survey\r\n")

body.extend(f"--{boundary}\r\n".encode())
body.extend(b'Content-Disposition: form-data; name="gsd_m"\r\n\r\n')
body.extend(b"0.5\r\n")

body.extend(f"--{boundary}--\r\n".encode())

print("Submitting Venice aerial image to http://127.0.0.1:8000/api/v1/uploads...")
req = urllib.request.Request(
    "http://127.0.0.1:8000/api/v1/uploads",
    data=bytes(body),
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    method="POST",
)

with urllib.request.urlopen(req, timeout=90) as resp:
    res = json.loads(resp.read().decode("utf-8"))

upload_id = res["id"]
print(f"Upload completed! Upload ID: {upload_id}")
print(f"Status: {res.get('status')}")
print(f"Annotated URL: {res.get('annotated_url')}")
print(f"\nExplanation Paragraph:\n{res.get('explanation')}")

print("\nFetching full detections...")
det_req = urllib.request.Request(f"http://127.0.0.1:8000/api/v1/uploads/{upload_id}/detections")
with urllib.request.urlopen(det_req, timeout=30) as resp:
    det_json = json.loads(resp.read().decode("utf-8"))

print(f"Total Object Detections: {len([d for d in det_json.get('detections', []) if d.get('kind') == 'box'])}")
print(f"Total Landcover Polygons: {len([d for d in det_json.get('detections', []) if d.get('kind') == 'polygon'])}")
print(f"Landcover Summary: {json.dumps(det_json.get('coverage', {}).get('by_class', []), indent=2)}")

# Save annotated image locally to artifact directory as well
ann_req = urllib.request.Request(f"http://127.0.0.1:8000/api/v1/uploads/{upload_id}/annotated")
with urllib.request.urlopen(ann_req, timeout=30) as resp:
    ann_bytes = resp.read()

out_ann = Path(f"data/uploads/{upload_id}/annotated.jpg")
print(f"Annotated JPEG size: {len(ann_bytes)} bytes at {out_ann}")

# Save in artifacts folder for visual inspection
artifact_ann = Path("C:/Users/Vanshaj sharma/.gemini/antigravity-ide/brain/26fe0f6a-f09a-4a7f-bb2c-76f98f9eccc6/venice_annotated.jpg")
artifact_ann.write_bytes(ann_bytes)
print(f"Saved artifact copy to: {artifact_ann}")
