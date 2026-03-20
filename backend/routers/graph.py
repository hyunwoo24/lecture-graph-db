from fastapi import APIRouter, HTTPException
from app.database import Neo4jDB
from app.models import NodeCreate, RelationshipCreate, GraphResponse, GraphImportData


router = APIRouter(prefix="/graph", tags=["graph"])

LABEL_KEY_MAP = {
    "Person": "name",
    "Location": "name",
    "Vehicle": "plate",
    "Phone": "number",
    "Account": "number",
    "Organization": "name",
    "Event": "type",
    "Evidence": "type",
}

@router.post("/nodes", summary="노드 생성 (MERGE)")
async def create_node(node: NodeCreate):
    if not node.properties:
        raise HTTPException(status_code=400, detail="properties는 비어있을 수 없습니다")

    key_prop = LABEL_KEY_MAP.get(node.label)
    if key_prop and key_prop in node.properties:
        extra = {k: v for k, v in node.properties.items() if k != key_prop}
        query = f"MERGE (n:{node.label} {{{key_prop}: ${key_prop}}})"
        if extra:
            set_str = ", ".join(f"n.{k} = ${k}" for k in extra)
            query += f" ON CREATE SET {set_str} ON MATCH SET {set_str}"
        query += " RETURN n"
        result = await Neo4jDB.execute_query(query, node.properties)
    else:
        props_str = ", ".join(f"{k}: ${k}" for k in node.properties)
        query = f"MERGE (n:{node.label} {{{props_str}}}) RETURN n"
        result = await Neo4jDB.execute_query(query, node.properties)
    return {"created": result}

@router.get("/nodes", summary="전체 노드 조회")
async def get_all_nodes():
    query = """
    MATCH (n)
    RETURN elementId(n) AS id, labels(n) AS labels, properties(n) AS props
    ORDER BY elementId(n)
    """
    return await Neo4jDB.execute_query(query)

@router.post("/relationships", summary="관계 생성 (MERGE)")
async def create_relationship(rel: RelationshipCreate):
    query = f"""
    MATCH (a:{rel.from_label} {{{rel.from_key}: $from_val}})
    MATCH (b:{rel.to_label} {{{rel.to_key}: $to_val}})
    MERGE (a)-[r:{rel.rel_type}]->(b)
    SET r += $props
    RETURN type(r) AS type, properties(r) AS props
    """
    params = {
        "from_val": rel.from_value,
        "to_val": rel.to_value,
        "props": rel.properties or {},
    }
    result = await Neo4jDB.execute_query(query, params)
    if not result:
        raise HTTPException(status_code=404, detail="노드를 찾을 수 없습니다")
    return {"created": result}

@router.get("/full", summary="전체 그래프 (프론트 시각화용)")
async def get_full_graph():
    nodes_query = """
    MATCH (n)
    RETURN elementId(n) AS id, labels(n) AS labels, properties(n) AS props
    """
    rels_query = """
    MATCH (a)-[r]->(b)
    RETURN elementId(a) AS source, elementId(b) AS target,
           type(r) AS type, properties(r) AS props
    """
    nodes = await Neo4jDB.execute_query(nodes_query)
    rels = await Neo4jDB.execute_query(rels_query)
    return {"nodes": nodes, "relationships": rels}


@router.delete("/nodes/{node_id}", summary="노드 삭제 (연결 관계 포함)")
async def delete_node(node_id: str):
    query = "MATCH (n) WHERE elementId(n) = $id DETACH DELETE n"
    await Neo4jDB.execute_query(query, {"id": node_id})
    return {"deleted": node_id}



@router.delete("/all", summary="전체 그래프 초기화")
async def clear_graph():
    await Neo4jDB.execute_query("MATCH (n) DETACH DELETE n")
    return {"message": "전체 그래프 초기화 완료"}

@router.get("/stats", summary="그래프 통계")
async def get_stats():
    query = """
    MATCH (n)
    WITH count(n) AS node_count
    MATCH ()-[r]->()
    RETURN node_count, count(r) AS rel_count
    """
    result = await Neo4jDB.execute_query(query)
    return result[0] if result else {"node_count": 0, "rel_count": 0}

@router.get("/search", summary="노드 키워드 검색")
async def search_nodes(q: str, label: str = None):
    """키워드로 노드를 검색합니다. label을 지정하면 해당 타입만 검색합니다."""
    if not q or len(q.strip()) == 0:
        raise HTTPException(status_code=400, detail="검색어(q)를 입력하세요")

    label_filter = f":{label}" if label else ""
    query = f"""
    MATCH (n{label_filter})
    WHERE any(key IN keys(n)
          WHERE toString(n[key]) CONTAINS $keyword)
    RETURN elementId(n) AS id, labels(n) AS labels, properties(n) AS pro
    """

@router.get("/neighbors/{node_id}", summary="특정 노드의 이웃 조회")
async def get_neighbors(node_id: str, depth: int = 1):
    """특정 노드에서 depth 단계 이내로 연결된 이웃 노드와 관계를 반환합니다."""
    if depth < 1 or depth > 3:
        raise HTTPException(status_code=400, detail="depth는 1~3 범위여야 합니다")

    query = f"""
    MATCH (start) WHERE elementId(start) = $id
    CALL {{
        WITH start
        MATCH path = (start)-[*1..{depth}]-(neighbor)
        RETURN DISTINCT neighbor, relationships(path) AS rels
    }}
    WITH collect(DISTINCT neighbor) AS neighbors,
         collect(rels) AS all_rels
    UNWIND neighbors AS n
    WITH neighbors, all_rels, collect(DISTINCT {{
        id: elementId(n), labels: labels(n), props: properties(n)
    }}) AS neighbor_nodes
    UNWIND all_rels AS rel_list
    UNWIND rel_list AS r
    WITH neighbor_nodes, collect(DISTINCT {{
        source: elementId(startNode(r)),
        target: elementId(endNode(r)),
        type: type(r),
        props: properties(r)
    }}) AS relationships
    RETURN neighbor_nodes AS nodes, relationships
    """
    try:
        result = await Neo4jDB.execute_query(query, {"id": node_id})
        if not result:
            return {"nodes": [], "relationships": []}
        return result[0]
    except Exception:
        simple_query = """
        MATCH (start)-[r]-(neighbor)
        WHERE elementId(start) = $id
        RETURN elementId(neighbor) AS id, labels(neighbor) AS labels,
               properties(neighbor) AS props, type(r) AS rel_type,
               elementId(startNode(r)) AS source, elementId(endNode(r)) AS target,
               properties(r) AS rel_props
        """
        rows = await Neo4jDB.execute_query(simple_query, {"id": node_id})
        nodes, rels, seen_nodes = [], [], set()
        for row in rows:
            if row["id"] not in seen_nodes:
                nodes.append({"id": row["id"], "labels": row["labels"], "props": row["props"]})
                seen_nodes.add(row["id"])
            rels.append({
                "source": row["source"], "target": row["target"],
                "type": row["rel_type"], "props": row["rel_props"],
            })
        return {"nodes": nodes, "relationships": rels}

@router.patch("/nodes/{node_id}", summary="노드 속성 수정")
async def update_node(node_id: str, properties: dict):
    """기존 노드의 속성을 업데이트합니다. 전달된 속성만 덮어씁니다."""
    if not properties:
        raise HTTPException(status_code=400, detail="수정할 속성이 비어있습니다")

    set_str = ", ".join(f"n.{k} = ${k}" for k in properties)
    query = f"""
    MATCH (n) WHERE elementId(n) = $id
    SET {set_str}
    RETURN elementId(n) AS id, labels(n) AS labels, properties(n) AS props
    """
    params = {"id": node_id, **properties}
    result = await Neo4jDB.execute_query(query, params)
    if not result:
        raise HTTPException(status_code=404, detail="노드를 찾을 수 없습니다")
    return {"updated": result[0]}

@router.delete("/relationships/{rel_id}", summary="개별 관계 삭제")
async def delete_relationship(rel_id: str):
    """특정 관계를 ID로 삭제합니다."""
    query = """
    MATCH ()-[r]->()
    WHERE elementId(r) = $id
    WITH r, type(r) AS rtype, properties(r) AS rprops
    DELETE r
    RETURN rtype AS type, rprops AS props
    """
    result = await Neo4jDB.execute_query(query, {"id": rel_id})
    if not result:
        raise HTTPException(status_code=404, detail="관계를 찾을 수 없습니다")
    return {"deleted": result[0]}

@router.patch("/relationships/{rel_id}", summary="관계 속성 수정")
async def update_relationship(rel_id: str, properties: dict):
    """기존 관계의 속성을 업데이트합니다."""
    if not properties:
        raise HTTPException(status_code=400, detail="수정할 속성이 비어있습니다")

    query = """
    MATCH ()-[r]->()
    WHERE elementId(r) = $id
    SET r += $props
    RETURN type(r) AS type, properties(r) AS props
    """
    result = await Neo4jDB.execute_query(query, {"id": rel_id, "props": properties})
    if not result:
        raise HTTPException(status_code=404, detail="관계를 찾을 수 없습니다")
    return {"updated": result[0]}

@router.get("/export", summary="전체 그래프를 JSON으로 내보내기")
async def export_graph():
    """현재 그래프의 모든 노드와 관계를 백업용 JSON으로 반환합니다."""
    nodes = await Neo4jDB.execute_query("""
        MATCH (n)
        RETURN labels(n) AS labels, properties(n) AS props
    """)
    rels = await Neo4jDB.execute_query("""
        MATCH (a)-[r]->(b)
        RETURN labels(a)[0] AS from_label, properties(a) AS from_props,
               type(r) AS rel_type, properties(r) AS rel_props,
               labels(b)[0] AS to_label, properties(b) AS to_props
    """)
    return {
        "nodes": nodes,
        "relationships": rels,
        "stats": {"node_count": len(nodes), "rel_count": len(rels)},
    }


@router.post("/import", summary="JSON에서 그래프 복원")
async def import_graph(data: GraphImportData, clear_first: bool = False):
    """내보낸 JSON 데이터로 그래프를 복원합니다. clear_first=True이면 기존 데이터를 먼저 삭제합니다."""
    if clear_first:
        await Neo4jDB.execute_query("MATCH (n) DETACH DELETE n")

    imported_nodes = 0
    for node in data.nodes:
        labels = node.get("labels", [])
        props = node.get("props", {})
        if not labels or not props:
            continue
        label = labels[0]
        key_prop = LABEL_KEY_MAP.get(label)
        if key_prop and key_prop in props:
            extra = {k: v for k, v in props.items() if k != key_prop}
            query = f"MERGE (n:{label} {{{key_prop}: ${key_prop}}})"
            if extra:
                set_str = ", ".join(f"n.{k} = ${k}" for k in extra)
                query += f" ON CREATE SET {set_str} ON MATCH SET {set_str}"
            query += " RETURN n"
        else:
            prop_str = ", ".join(f"{k}: ${k}" for k in props)
            query = f"MERGE (n:{label} {{{prop_str}}}) RETURN n"
        await Neo4jDB.execute_query(query, props)
        imported_nodes += 1

    imported_rels = 0
    for rel in data.relationships:
        fl = rel.get("from_label")
        fp = rel.get("from_props", {})
        tl = rel.get("to_label")
        tp = rel.get("to_props", {})
        rt = rel.get("rel_type")
        rp = rel.get("rel_props", {})
        if not all([fl, fp, tl, tp, rt]):
            continue

        from_key = LABEL_KEY_MAP.get(fl, "name")
        to_key = LABEL_KEY_MAP.get(tl, "name")
        from_val = fp.get(from_key)
        to_val = tp.get(to_key)
        if not from_val or not to_val:
            continue

        query = f"""
        MATCH (a:{fl} {{{from_key}: $from_val}})
        MATCH (b:{tl} {{{to_key}: $to_val}})
        MERGE (a)-[r:{rt}]->(b)
        SET r += $props
        RETURN type(r) AS type
        """
        await Neo4jDB.execute_query(query, {
            "from_val": from_val, "to_val": to_val, "props": rp,
        })
        imported_rels += 1

    return {
        "imported_nodes": imported_nodes,
        "imported_relationships": imported_rels,
    }
