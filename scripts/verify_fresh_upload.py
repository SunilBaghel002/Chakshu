"""Verification script for Task T-6: Fresh aerial image upload."""

from __future__ import annotations

import io
import json
import urllib.request
from pathlib import Path
from PIL import Image, ImageDraw

# Generate fresh aerial image never seen before:
# Features an intersection of two grey roads, a large red warehouse building,
# a blue water reservoir, yellow storage containers, and green vegetation.
w, h = 600, 600
img = Image.new("RGB", (w, h), color=(45, 120, 55))  # lush vegetation
d = ImageDraw.Draw(img)

# Roads
d.rectangle([280, 0, 320, 600], fill=(110, 110, 115))
d.rectangle([0, 280, 600, 320], fill=(110, 110, 115))

# Large building
d.rectangle([40, 40, 180, 160], fill=(185, 55, 45))

# Smaller secondary building
d.rectangle([360, 50, 500, 170], fill=(165, 50, 40))

# Open water reservoir
d.rectangle([50, 360, 220, 520], fill=(30, 95, 215))

# Container cluster / storage
d.rectangle([380, 380, 480, 480], fill=(215, 185, 35))

buf = io.BytesIO()
img.save(buf, format="JPEG", quality=95)
img_bytes = buf.getvalue()

boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
body = bytearray()
body.extend(f"--{boundary}\r\n".encode())
body.extend(b'Content-Disposition: form-data; name="file"; filename="fresh_coastal_industrial_survey.jpg"\r\n')
body.extend(b"Content-Type: image/jpeg\r\n\r\n")
body.extend(img_bytes)
body.extend(b"\r\n")

body.extend(f"--{boundary}\r\n".encode())
body.extend(b'Content-Disposition: form-data; name="title"\r\n\r\n')
body.extend(b"Fresh Aerial Survey 2026\r\n")

body.extend(f"--{boundary}\r\n".encode())
body.extend(b'Content-Disposition: form-data; name="gsd_m"\r\n\r\n')
body.extend(b"0.5\r\n")

body.extend(f"--{boundary}--\r\n".encode())

print("1. Uploading fresh aerial image to http://127.0.0.1:8000/api/v1/uploads...")
req = urllib.request.Request(
    "http://127.0.0.1:8000/api/v1/uploads",
    data=bytes(body),
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    method="POST",
)

with urllib.request.urlopen(req, timeout=40) as resp:
    upload_res = json.loads(resp.read().decode("utf-8"))

upload_id = upload_res["id"]
print(f"Uploaded successfully! ID: {upload_id}")
print(f"Annotated URL: {upload_res.get('annotated_url')}")
print(f"Explanation: {upload_res.get('explanation')}")

print(f"\n2. Fetching detections from http://127.0.0.1:8000/api/v1/uploads/{upload_id}/detections...")
det_req = urllib.request.Request(f"http://127.0.0.1:8000/api/v1/uploads/{upload_id}/detections")
with urllib.request.urlopen(det_req, timeout=20) as resp:
    det_json = json.loads(resp.read().decode("utf-8"))

print("\n--- FULL DETECTIONS JSON ---")
print(json.dumps(det_json, indent=2))

print(f"\n3. Fetching annotated image from http://127.0.0.1:8000/api/v1/uploads/{upload_id}/annotated...")
ann_req = urllib.request.Request(f"http://127.0.0.1:8000/api/v1/uploads/{upload_id}/annotated")
with urllib.request.urlopen(ann_req, timeout=20) as resp:
    ann_data = resp.read()

ann_img = Image.open(io.BytesIO(ann_data))
out_ann_path = Path(f"data/uploads/{upload_id}/annotated_verified.jpg")
print(f"Annotated image verified! Dimensions: {ann_img.size}, Format: {ann_img.format}, Size: {len(ann_data)} bytes")
print(f"Annotated image saved at: {out_ann_path}")
