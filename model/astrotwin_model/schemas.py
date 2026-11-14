"""Pydantic v2 models for every shape in CONTRACT.md section 4.

STUB by Person 2 (hour 0). Person 1 owns this file and may extend it,
but the shapes must keep matching CONTRACT.md exactly.
"""
from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

RegionIdLiteral = Literal[
    "head_neck", "chest", "heart", "spine", "pelvis",
    "left_arm", "right_arm", "left_leg", "right_leg",
]
REGION_IDS: tuple[str, ...] = RegionIdLiteral.__args__  # type: ignore[attr-defined]

InjuryType = Literal["ankle_sprain", "wrist_fracture", "lower_back_strain", "thigh_muscle_tear"]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


# ---- Inputs ---------------------------------------------------------------

class Baseline(_Strict):
    hip_bmd_g_cm2: float
    spine_bmd_g_cm2: float
    leg_lean_mass_kg: float
    vo2max_ml_kg_min: float


class CrewProfile(_Strict):
    id: str
    name: str
    age: int
    sex: Literal["F", "M"]
    mass_kg: float
    fitness: Literal["low", "average", "high"]
    role: str
    baseline: Baseline


class Mission(_Strict):
    destination: Literal["ISS", "MOON", "MARS"]
    duration_days: int = Field(ge=7, le=900)
    eva_days: List[int] = Field(default_factory=list)


class Injury(_Strict):
    type: InjuryType
    severity: Literal[1, 2, 3]
    day: int = Field(ge=0)
    side: Optional[Literal["left", "right"]] = None

    @model_validator(mode="after")
    def _check_side(self) -> "Injury":
        if self.type == "lower_back_strain":
            if self.side is not None:
                raise ValueError("lower_back_strain must have side null")
        elif self.side is None:
            raise ValueError(f"{self.type} needs a side: 'left' or 'right'")
        return self


class Countermeasures(_Strict):
    resistance_min_per_day: float = Field(default=60, ge=0, le=120)
    aerobic_min_per_day: float = Field(default=60, ge=0, le=120)
    protein_g_per_kg: float = Field(default=1.2, ge=0.8, le=2.0)
    calorie_pct: float = Field(default=100, ge=80, le=110)
    bisphosphonate: bool = False


class ForecastRequest(_Strict):
    crew: CrewProfile
    mission: Mission
    injury: Optional[Injury] = None
    countermeasures: Countermeasures


# ---- Outputs --------------------------------------------------------------

class RiskScore(_Strict):
    level: Literal["green", "yellow", "red"]
    score: int = Field(ge=0, le=100)
    reason: str


class Series(_Strict):
    hip_bmd_pct: List[float]
    spine_bmd_pct: List[float]
    leg_muscle_pct: List[float]
    vo2max_pct: List[float]


class Band(_Strict):
    low: List[float]
    high: List[float]


class Bands(_Strict):
    hip_bmd_pct: Band
    spine_bmd_pct: Band
    leg_muscle_pct: Band
    vo2max_pct: Band


class Regions(_Strict):
    head_neck: List[float]
    chest: List[float]
    heart: List[float]
    spine: List[float]
    pelvis: List[float]
    left_arm: List[float]
    right_arm: List[float]
    left_leg: List[float]
    right_leg: List[float]


class Risks(_Strict):
    fracture: RiskScore
    eva_fitness: RiskScore
    landing_fitness: RiskScore


class Event(_Strict):
    day: int
    type: Literal["launch", "injury", "eva", "landing"]
    label: str


class Meta(_Strict):
    model_version: str
    params_version: str


class ForecastResponse(_Strict):
    days: List[int]
    landing_day: int
    series: Series
    bands: Bands
    regions: Regions
    risks: Risks
    events: List[Event]
    meta: Meta


class CompareRequest(_Strict):
    request: ForecastRequest
    alternative: Countermeasures


class CompareResponse(_Strict):
    baseline: ForecastResponse
    alternative: ForecastResponse


class ExplainRequest(_Strict):
    forecast: ForecastResponse
    comparison: Optional[CompareResponse] = None
    crew_name: str
    audience: Literal["surgeon", "crew"]


class ExplainResponse(_Strict):
    text: str
    source: Literal["ai", "template"]


class InjuryInfo(_Strict):
    type: str
    label: str
    needs_side: bool


class DemoSeed(_Strict):
    crew: CrewProfile
    mission: Mission
    injury: Optional[Injury]
    countermeasures: Countermeasures
    alternative: Countermeasures


class Defaults(_Strict):
    countermeasures: Countermeasures
    mission: Mission
    demo: DemoSeed


class Health(_Strict):
    status: Literal["ok"]
    model_version: str
    params_version: str
