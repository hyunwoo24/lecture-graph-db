from pydantic import BaseModel
from typing import Optional


class NodeCreate(BaseModel):
    label: str
    properties: dict


class RelationshipCreate(BaseModel):
    from_label: str
    from_key: str
    from_value: str
    to_label: str
    to_key: str
    to_value: str
    rel_type: str
    properties: Optional[dict] = {}


class GraphResponse(BaseModel):
    nodes: list
    relationships: list


class GraphImportData(BaseModel):
    nodes: list[dict]
    relationships: list[dict]


class TextInput(BaseModel):
    text: str


class BatchDocument(BaseModel):
    id: str
    text: str


class BatchInput(BaseModel):
    documents: list[BatchDocument]
    auto_save: bool = False


class ExtractedNode(BaseModel):
    label: str
    properties: dict
    confidence: float = 1.0


class ExtractedRelationshipEndpoint(BaseModel):
    label: str
    key: str
    value: str


class ExtractedRelationship(BaseModel):
    from_node: ExtractedRelationshipEndpoint
    to_node: ExtractedRelationshipEndpoint
    type: str
    properties: Optional[dict] = {}
    confidence: float = 1.0


class ExtractedData(BaseModel):
    entities: list[ExtractedNode] = []
    relationships: list[ExtractedRelationship] = []


class QuestionInput(BaseModel):
    question: str


class QuestionInput(BaseModel):
    question: str


class ConversationStart(BaseModel):
    first_question: str

class ConversationMessage(BaseModel):
    session_id: str
    question: str

class CypherExplainRequest(BaseModel):
    cypher: str
