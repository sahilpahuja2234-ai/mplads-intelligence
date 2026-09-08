"""
app/models/mp.py  —  `mps` table ORM model
"""

from sqlalchemy import Column, Text, Date
from app.models.base import Base


class MP(Base):
    __tablename__ = "mps"

    mp_id        = Column(Text, primary_key=True)
    name         = Column(Text, nullable=False)
    house        = Column(Text, nullable=False)   # LOK_SABHA | RAJYA_SABHA | NOMINATED
    state        = Column(Text, nullable=False)
    constituency = Column(Text)
    party        = Column(Text)
    term_start   = Column(Date)
    term_end     = Column(Date)
