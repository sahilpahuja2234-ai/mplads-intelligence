"""
app/ml/detectors/geo_anomaly.py
================================
Uses DBSCAN on (lat, lng) to find abnormally dense project clusters.
A cluster is suspicious when multiple MPs / vendors converge on the
same tiny area (e.g., fake coordinates, split-billing at same site).

Returns:
  - geo_clusters: list of dicts with cluster metadata
  - project_scores: Series[float] 0-100 per project
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN

from app.core.config import GEO_DBSCAN_EPS_KM, GEO_DBSCAN_MIN_SAMPLES


# DBSCAN eps in radians (haversine metric expects radians)
_EARTH_RADIUS_KM = 6371.0
_EPS_RAD = GEO_DBSCAN_EPS_KM / _EARTH_RADIUS_KM


@dataclass
class GeoClusterRecord:
    cluster_id: str
    centroid_lat: float
    centroid_lng: float
    radius_meters: float
    project_count: int
    reason: str
    project_ids: List[str]


def detect(features_df: pd.DataFrame) -> Tuple[List[GeoClusterRecord], pd.Series]:
    df = features_df.reset_index(drop=True).copy()

    valid = df.dropna(subset=["latitude", "longitude"])
    scores = pd.Series(0.0, index=df.index, name="geo_anomaly_score")

    if len(valid) < GEO_DBSCAN_MIN_SAMPLES:
        return [], scores

    coords_rad = np.radians(valid[["latitude", "longitude"]].values)

    db = DBSCAN(
        eps=_EPS_RAD,
        min_samples=GEO_DBSCAN_MIN_SAMPLES,
        algorithm="ball_tree",
        metric="haversine",
    ).fit(coords_rad)

    labels = db.labels_   # -1 = noise
    valid = valid.copy()
    valid["_cluster_label"] = labels

    geo_clusters: List[GeoClusterRecord] = []
    cluster_idx = 0

    for label in set(labels):
        if label == -1:
            continue
        members = valid[valid["_cluster_label"] == label]
        if len(members) < GEO_DBSCAN_MIN_SAMPLES:
            continue

        centroid_lat = members["latitude"].mean()
        centroid_lng = members["longitude"].mean()

        # Compute actual radius = max haversine from centroid
        def _haversine_m(lat1, lon1, lat2, lon2):
            R = 6_371_000
            φ1, φ2 = math.radians(lat1), math.radians(lat2)
            dφ = math.radians(lat2 - lat1)
            dλ = math.radians(lon2 - lon1)
            a = math.sin(dφ / 2) ** 2 + math.cos(φ1) * math.cos(φ2) * math.sin(dλ / 2) ** 2
            return 2 * R * math.asin(math.sqrt(a))

        radii = [
            _haversine_m(centroid_lat, centroid_lng, row["latitude"], row["longitude"])
            for _, row in members.iterrows()
        ]
        radius_m = max(radii) if radii else 0

        n_unique_mps = members["mp_id"].nunique()
        n_unique_vendors = members["vendor_id"].nunique() if "vendor_id" in members.columns else 1

        reason = (
            f"{len(members)} projects within {radius_m:.0f}m radius"
            f" across {n_unique_mps} MP(s)"
            f" — unusually dense for rural coordinates."
        )

        # Severity: more members + more MPs → higher score
        score = min(100, 20 + (len(members) * 8) + (n_unique_mps * 10))
        cluster_idx += 1
        cid = f"GEO-{cluster_idx:04d}"

        geo_clusters.append(GeoClusterRecord(
            cluster_id=cid,
            centroid_lat=round(centroid_lat, 6),
            centroid_lng=round(centroid_lng, 6),
            radius_meters=round(radius_m, 1),
            project_count=len(members),
            reason=reason,
            project_ids=members["project_id"].tolist(),
        ))

        for orig_idx in members.index:
            scores.loc[orig_idx] = score

    return geo_clusters, scores.clip(0, 100)
