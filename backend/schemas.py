from pydantic import BaseModel, Field


class ComponentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    component_type: str = Field(min_length=1, max_length=50)
    description: str | None = None


class ComponentOut(BaseModel):
    id: int
    name: str
    component_type: str
    description: str | None = None


class DependencyCreate(BaseModel):
    source_component_id: int
    target_component_id: int
    dependency_type: str = "hard"
    source_handle: str | None = Field(default=None, max_length=30)
    target_handle: str | None = Field(default=None, max_length=30)


class DependencyOut(BaseModel):
    id: int
    source_component_id: int
    target_component_id: int
    dependency_type: str
    source_handle: str
    target_handle: str


class AnalysisRunRequest(BaseModel):
    component_id: int


class AnalysisComponentOut(BaseModel):
    id: int
    name: str
    component_type: str
    description: str | None = None


class AnalysisResultOut(BaseModel):
    root_component: AnalysisComponentOut
    affected_components: list[AnalysisComponentOut]
    affected_count: int
