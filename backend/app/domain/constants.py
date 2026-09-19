"""Domain constants and scientific thresholds for Chakshu.

Pure constants module. No framework or I/O imports.
Every threshold carries a comment stating its literature source,
standard reference, or initial baseline.
"""

from __future__ import annotations

# --- Surface Reflectance Scaling ---
# Sentinel-2 L2A reflectance is stored as uint16 with a 10000 scale factor.
# Divide by 10000.0 before computing spectral indices (PRD 6 §9).
SCALE_FACTOR_S2_L2A: float = 10000.0

# --- Spectral Index Classification Thresholds (PRD 2 §6 Track 1) ---
# NDWI (Normalized Difference Water Index) - McFeeters 1996
NDWI_WATER_THRESHOLD: float = 0.15

# NDSI (Normalized Difference Snow Index) - Hall et al. 1995
NDSI_SNOW_THRESHOLD: float = 0.40

# NDVI (Normalized Difference Vegetation Index) - Rouse et al. 1974
NDVI_VEGETATION_THRESHOLD: float = 0.40

# NDBI (Normalized Difference Built-up Index) - Zha et al. 2003
NDBI_BUILT_THRESHOLD: float = 0.05
NDVI_BUILT_MAX: float = 0.25  # Built-up requires low vegetation

# Crop boundaries (moderate NDVI with low built-up response)
NDVI_CROP_MIN: float = 0.20
NDVI_CROP_MAX: float = 0.40
NDBI_CROP_MAX: float = 0.05

# Bare soil (low vegetation, non-built)
NDVI_BARE_MAX: float = 0.20

# --- Morphological Operations and Filtering (PRD 2 §6) ---
# 3x3 structuring element for morphological opening to eliminate isolated noise
MORPHOLOGICAL_KERNEL_SIZE: int = 3

# Minimum connected component size in pixels; patches smaller than this are dropped
MIN_CONNECTED_COMPONENTS_PX: int = 4

# Minimum box area in square pixels for model detections (PRD 2 §6.3 step 4)
MIN_BOX_AREA_PX: float = 16.0
MIN_BOX_AREA_FRACTION: float = 0.0001
MIN_ASPECT_RATIO: float = 1.0 / 12.0
MAX_ASPECT_RATIO: float = 12.0

# --- Detection Filtering and NMS (PRD 2 §6.3, PRD 8 §G) ---
# Minimum score threshold for retaining model-detected bounding boxes
DETECTION_SCORE_MIN: float = 0.50

# Intersection-over-Union (IoU) threshold for Non-Maximum Suppression deduplication
DETECTION_NMS_IOU: float = 0.50

# --- Temporal Change Tracking & Merging (PRD 2 §6, PRD 3 §A11) ---
# Minimum consecutive monthly observations supporting a change before onset is confirmed
PERSISTENCE_K: int = 3

# Spatial IoU threshold for associating change polygons across time steps
MERGE_IOU_THRESHOLD: float = 0.30

# --- Natural Language Routing (PRD 2 §7) ---
# Minimum cosine similarity threshold for routing questions to deterministic intents
INTENT_MATCH_THRESHOLD: float = 0.72

# --- Image Processing Limits ---
# Longest edge px threshold before downscaling for Gemini (PRD 2 §6.3 step 1)
MAX_IMAGE_EDGE_PX: int = 1568

# --- Image Registration Tolerance (PRD 6 §9, Kuglin & Hines 1975) ---
# Maximum shift magnitude in pixels permitted between temporal observation pairs
MAX_REGISTRATION_SHIFT_PX: float = 2.0
MAX_REGISTRATION_SHIFT: float = 15.0

# --- Central Model & Analysis Configuration (§4, §46) ---
MODEL_NAME: str = "Chakshu-Calibrated-RS-Segmenter"
MODEL_VERSION: str = "2.1.0-appearance-invariant"
INPUT_MAX_SIZE: int = 2048
MIN_POLYGON_IOU: float = 0.60
MAX_DISCRETE_FEATURE_AREA: float = 150000.0
CLASS_THRESHOLDS: dict[str, float] = {
    "water": 0.65,
    "building": 0.60,
    "vegetation": 0.65,
    "snow": 0.80,
    "crop": 0.60,
    "bare": 0.60,
    "change": 0.65,
}
