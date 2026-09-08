"""
app/models/duplicate.py  —  `duplicate_clusters` + `duplicate_cluster_members` ORM models
"""

from sqlalchemy import Column, Text, Float, Integer, ForeignKey
from app.models.base import Base


class DuplicateCluster(Base):
    __tablename__ = "duplicate_clusters"

    cluster_id       = Column(Text, primary_key=True)
    similarity_score = Column(Float, nullable=False)
    cluster_reason   = Column(Text)   # TEXT_SIMILARITY | GEO_PROXIMITY | BOTH
    created_at       = Column(Text)


class DuplicateClusterMember(Base):
    __tablename__ = "duplicate_cluster_members"

    cluster_id = Column(Text, ForeignKey("duplicate_clusters.cluster_id"), primary_key=True)
    project_id = Column(Text, primary_key=True)
