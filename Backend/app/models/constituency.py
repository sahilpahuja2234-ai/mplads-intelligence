"""
app/models/constituency.py  —  `constituencies` table ORM model
"""

from sqlalchemy import Column, Text, Float
from app.models.base import Base


class Constituency(Base):
    __tablename__ = "constituencies"

    constituency_id  = Column(Text, primary_key=True)
    name             = Column(Text, nullable=False)
    state            = Column(Text, nullable=False)
    district         = Column(Text, nullable=False)
    centroid_lat     = Column(Float)
    centroid_lng     = Column(Float)
    boundary_geojson = Column(Text)
