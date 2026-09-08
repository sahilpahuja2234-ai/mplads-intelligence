"""
app/ml/detectors/duplicate_detector.py
=========================================
Detects near-duplicate/similar projects using:

  1. TF-IDF cosine similarity on work_description.
  2. Haversine geographic distance between project coordinates.

Projects in the same district with:
  - text similarity ≥ DUPLICATE_TEXT_THRESHOLD (0.75), OR
  - geographic distance ≤ DUPLICATE_GEO_THRESHOLD_M (500 m)
are grouped into clusters via union-find.

Returns:
  - clusters: list of DuplicateClusterRecord dicts (cluster_id, members, scores)
  - project_scores: Series[float] — max similarity score per project, 0-100
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.core.config import (
    DUPLICATE_TEXT_THRESHOLD,
    DUPLICATE_GEO_THRESHOLD_M,
)


# ---------------------------------------------------------------------------
# Union-Find (disjoint set) for cluster grouping
# ---------------------------------------------------------------------------
class UnionFind:
    def __init__(self, n: int):
        self.parent = list(range(n))
        self.rank   = [0] * n

    def find(self, x: int) -> int:
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, x: int, y: int):
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return
        if self.rank[rx] < self.rank[ry]:
            rx, ry = ry, rx
        self.parent[ry] = rx
        if self.rank[rx] == self.rank[ry]:
            self.rank[rx] += 1


# ---------------------------------------------------------------------------
# Haversine distance
# ---------------------------------------------------------------------------
def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6_371_000  # Earth radius in metres
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    dφ = math.radians(lat2 - lat1)
    dλ = math.radians(lon2 - lon1)
    a = math.sin(dφ / 2) ** 2 + math.cos(φ1) * math.cos(φ2) * math.sin(dλ / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


# ---------------------------------------------------------------------------
# Main detection function
# ---------------------------------------------------------------------------
@dataclass
class DuplicateClusterRecord:
    cluster_id: str
    project_ids: List[str]
    similarity_score: float
    cluster_reason: str   # TEXT_SIMILARITY | GEO_PROXIMITY | BOTH


def detect(
    features_df: pd.DataFrame,
) -> Tuple[List[DuplicateClusterRecord], pd.Series]:
    """
    Parameters
    ----------
    features_df : wide feature DataFrame from build_feature_table()

    Returns
    -------
    (clusters, project_score_series)
        project_score_series is indexed by features_df's positional index, values 0-100.
    """
    df = features_df.reset_index(drop=True).copy()

    n = len(df)
    uf = UnionFind(n)
    edge_info: Dict[Tuple[int, int], dict] = {}   # (i, j) → {score, reason}

    # ── Text similarity (TF-IDF cosine) ──────────────────────────────────
    descriptions = df["work_description"].fillna("").tolist()
    tfidf = TfidfVectorizer(ngram_range=(1, 2), max_features=5000, min_df=2)
    try:
        tfidf_matrix = tfidf.fit_transform(descriptions)
    except ValueError:
        tfidf_matrix = None

    # Only compare within same district to keep O(n²) manageable
    for district in df["district"].unique():
        d_idx = df[df["district"] == district].index.tolist()
        if len(d_idx) < 2:
            continue

        # Text similarity
        if tfidf_matrix is not None:
            sub_matrix = tfidf_matrix[d_idx]
            sim_matrix = cosine_similarity(sub_matrix)
            for ii, i in enumerate(d_idx):
                for jj, j in enumerate(d_idx):
                    if jj <= ii:
                        continue
                    sim = float(sim_matrix[ii, jj])
                    if sim >= DUPLICATE_TEXT_THRESHOLD:
                        pair = (min(i, j), max(i, j))
                        existing = edge_info.get(pair, {})
                        edge_info[pair] = {
                            "text_sim": max(sim, existing.get("text_sim", 0)),
                            "geo_close": existing.get("geo_close", False),
                        }
                        uf.union(i, j)

        # Geographic proximity
        sub_df = df.loc[d_idx, ["latitude", "longitude"]].dropna()
        geo_idx = sub_df.index.tolist()
        for ii, i in enumerate(geo_idx):
            for j in geo_idx[ii + 1:]:
                lat1, lon1 = df.loc[i, "latitude"], df.loc[i, "longitude"]
                lat2, lon2 = df.loc[j, "latitude"], df.loc[j, "longitude"]
                try:
                    dist = _haversine_m(lat1, lon1, lat2, lon2)
                except Exception:
                    continue
                if dist <= DUPLICATE_GEO_THRESHOLD_M:
                    pair = (min(i, j), max(i, j))
                    existing = edge_info.get(pair, {})
                    existing["geo_close"] = True
                    existing.setdefault("text_sim", 0.0)
                    edge_info[pair] = existing
                    uf.union(i, j)

    # ── Group by cluster root ─────────────────────────────────────────────
    from collections import defaultdict
    groups: Dict[int, List[int]] = defaultdict(list)
    for i in range(n):
        root = uf.find(i)
        if any((min(i, j), max(i, j)) in edge_info for j in range(n) if i != j):
            groups[root].append(i)

    # Rebuild properly: only roots that have ≥ 2 members AND actual edges
    cluster_roots: Dict[int, List[int]] = defaultdict(list)
    for pair in edge_info:
        i, j = pair
        root = uf.find(i)
        cluster_roots[root].extend([i, j])

    # De-duplicate members per root
    cluster_roots = {k: list(dict.fromkeys(v)) for k, v in cluster_roots.items()}

    clusters: List[DuplicateClusterRecord] = []
    project_max_score: Dict[int, float] = {}

    for cidx, (root, members) in enumerate(cluster_roots.items()):
        if len(members) < 2:
            continue

        # Determine reason and similarity score for this cluster
        text_sims, has_geo = [], False
        for i in members:
            for j in members:
                if i >= j:
                    continue
                pair = (min(i, j), max(i, j))
                if pair in edge_info:
                    text_sims.append(edge_info[pair].get("text_sim", 0))
                    if edge_info[pair].get("geo_close"):
                        has_geo = True

        max_text = max(text_sims) if text_sims else 0
        has_text = max_text >= DUPLICATE_TEXT_THRESHOLD

        if has_text and has_geo:
            reason = "BOTH"
            sim_score = max_text * 0.5 + 0.5   # boost for combined signal
        elif has_text:
            reason = "TEXT_SIMILARITY"
            sim_score = max_text
        else:
            reason = "GEO_PROXIMITY"
            sim_score = 0.80   # fixed moderate score for geo-only

        sim_score = min(1.0, sim_score)
        dup_score = sim_score * 100

        cluster_id = f"DUP-{cidx + 1:04d}"
        project_ids = [df.loc[i, "project_id"] for i in members]

        clusters.append(DuplicateClusterRecord(
            cluster_id=cluster_id,
            project_ids=project_ids,
            similarity_score=round(sim_score, 4),
            cluster_reason=reason,
        ))

        for idx in members:
            project_max_score[idx] = max(project_max_score.get(idx, 0), dup_score)

    project_scores = pd.Series(
        [project_max_score.get(i, 0.0) for i in range(n)],
        index=range(n),
        name="duplicate_score",
    )
    return clusters, project_scores.clip(0, 100)
