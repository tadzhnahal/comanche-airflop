from fastapi import FastAPI, HTTPException

from analysis import build_adjacency, collect_affected_ids
from db import get_db_connection
from schemas import (
    AnalysisResultOut,
    AnalysisRunRequest,
    ComponentCreate,
    ComponentOut,
    DependencyCreate,
    DependencyOut,
)


app = FastAPI(title="Analytics Impact Map")


valid_source_handles = {
    "source-top",
    "source-right",
    "source-bottom",
    "source-left",
}

valid_target_handles = {
    "target-top",
    "target-right",
    "target-bottom",
    "target-left",
}


def component_row_to_dict(row):
    return {
        "id": row[0],
        "name": row[1],
        "component_type": row[2],
        "description": row[3],
    }


def dependency_row_to_dict(row):
    return {
        "id": row[0],
        "source_component_id": row[1],
        "target_component_id": row[2],
        "dependency_type": row[3],
        "source_handle": row[4],
        "target_handle": row[5],
    }


def get_dependency_handles(dependency, old_source_handle=None, old_target_handle=None):
    source_handle = dependency.source_handle or old_source_handle or "source-right"
    target_handle = dependency.target_handle or old_target_handle or "target-left"

    if source_handle not in valid_source_handles:
        raise HTTPException(status_code=400, detail="source_handle is invalid")

    if target_handle not in valid_target_handles:
        raise HTTPException(status_code=400, detail="target_handle is invalid")

    return source_handle, target_handle


@app.get("/")
def root():
    return {"message": "бэк жив"}


@app.get("/health/db")
def health_db():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("select 1;")
                row = cur.fetchone()

        return {
            "status": "ok",
            "database": "connected",
            "result": row[0],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"db error: {e}")


@app.post("/components", response_model=ComponentOut)
def create_component(component: ComponentCreate):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    insert into components (name, component_type, description)
                    values (%s, %s, %s)
                    returning id, name, component_type, description;
                    """,
                    (component.name, component.component_type, component.description),
                )
                row = cur.fetchone()

        return component_row_to_dict(row)

    except Exception as e:
        error_text = str(e).lower()

        if "duplicate key value" in error_text:
            raise HTTPException(status_code=400, detail="component with this name already exists")

        raise HTTPException(status_code=500, detail=f"db error: {e}")


@app.get("/components", response_model=list[ComponentOut])
def get_components():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    select id, name, component_type, description
                    from components
                    order by id;
                    """
                )
                rows = cur.fetchall()

        result = []

        for row in rows:
            result.append(component_row_to_dict(row))

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"db error: {e}")


@app.put("/components/{component_id}", response_model=ComponentOut)
def update_component(component_id: int, component: ComponentCreate):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    update components
                    set name = %s,
                        component_type = %s,
                        description = %s
                    where id = %s
                    returning id, name, component_type, description;
                    """,
                    (
                        component.name,
                        component.component_type,
                        component.description,
                        component_id,
                    ),
                )
                row = cur.fetchone()

                if not row:
                    raise HTTPException(status_code=404, detail="component not found")

        return component_row_to_dict(row)

    except HTTPException:
        raise

    except Exception as e:
        error_text = str(e).lower()

        if "duplicate key value" in error_text:
            raise HTTPException(status_code=400, detail="component with this name already exists")

        raise HTTPException(status_code=500, detail=f"db error: {e}")


@app.delete("/components/{component_id}")
def delete_component(component_id: int):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    select id, name
                    from components
                    where id = %s;
                    """,
                    (component_id,),
                )
                row = cur.fetchone()

                if not row:
                    raise HTTPException(status_code=404, detail="component not found")

                cur.execute(
                    """
                    delete from components
                    where id = %s;
                    """,
                    (component_id,),
                )

        return {
            "message": "component deleted",
            "deleted_component_id": row[0],
            "deleted_component_name": row[1],
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"db error: {e}")


@app.post("/dependencies", response_model=DependencyOut)
def create_dependency(dependency: DependencyCreate):
    if dependency.source_component_id == dependency.target_component_id:
        raise HTTPException(status_code=400, detail="component cannot depend on itself")

    if dependency.dependency_type not in ["hard", "soft"]:
        raise HTTPException(status_code=400, detail="dependency_type must be hard or soft")

    source_handle, target_handle = get_dependency_handles(dependency)

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "select id from components where id = %s;",
                    (dependency.source_component_id,),
                )
                source_row = cur.fetchone()

                cur.execute(
                    "select id from components where id = %s;",
                    (dependency.target_component_id,),
                )
                target_row = cur.fetchone()

                if not source_row or not target_row:
                    raise HTTPException(status_code=404, detail="one or both components do not exist")

                cur.execute(
                    """
                    insert into dependencies (
                        source_component_id,
                        target_component_id,
                        dependency_type,
                        source_handle,
                        target_handle
                    )
                    values (%s, %s, %s, %s, %s)
                    returning
                        id,
                        source_component_id,
                        target_component_id,
                        dependency_type,
                        source_handle,
                        target_handle;
                    """,
                    (
                        dependency.source_component_id,
                        dependency.target_component_id,
                        dependency.dependency_type,
                        source_handle,
                        target_handle,
                    ),
                )
                row = cur.fetchone()

        return dependency_row_to_dict(row)

    except HTTPException:
        raise

    except Exception as e:
        error_text = str(e).lower()

        if "duplicate key value" in error_text:
            raise HTTPException(status_code=400, detail="this dependency already exists")

        raise HTTPException(status_code=500, detail=f"db error: {e}")


@app.get("/dependencies", response_model=list[DependencyOut])
def get_dependencies():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    select
                        id,
                        source_component_id,
                        target_component_id,
                        dependency_type,
                        source_handle,
                        target_handle
                    from dependencies
                    order by id;
                    """
                )
                rows = cur.fetchall()

        result = []

        for row in rows:
            result.append(dependency_row_to_dict(row))

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"db error: {e}")


@app.put("/dependencies/{dependency_id}", response_model=DependencyOut)
def update_dependency(dependency_id: int, dependency: DependencyCreate):
    if dependency.source_component_id == dependency.target_component_id:
        raise HTTPException(status_code=400, detail="component cannot depend on itself")

    if dependency.dependency_type not in ["hard", "soft"]:
        raise HTTPException(status_code=400, detail="dependency_type must be hard or soft")

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    select id, source_handle, target_handle
                    from dependencies
                    where id = %s;
                    """,
                    (dependency_id,),
                )
                dependency_row = cur.fetchone()

                if not dependency_row:
                    raise HTTPException(status_code=404, detail="dependency not found")

                source_handle, target_handle = get_dependency_handles(
                    dependency,
                    old_source_handle=dependency_row[1],
                    old_target_handle=dependency_row[2],
                )

                cur.execute(
                    "select id from components where id = %s;",
                    (dependency.source_component_id,),
                )
                source_row = cur.fetchone()

                cur.execute(
                    "select id from components where id = %s;",
                    (dependency.target_component_id,),
                )
                target_row = cur.fetchone()

                if not source_row or not target_row:
                    raise HTTPException(status_code=404, detail="one or both components do not exist")

                cur.execute(
                    """
                    update dependencies
                    set source_component_id = %s,
                        target_component_id = %s,
                        dependency_type = %s,
                        source_handle = %s,
                        target_handle = %s
                    where id = %s
                    returning
                        id,
                        source_component_id,
                        target_component_id,
                        dependency_type,
                        source_handle,
                        target_handle;
                    """,
                    (
                        dependency.source_component_id,
                        dependency.target_component_id,
                        dependency.dependency_type,
                        source_handle,
                        target_handle,
                        dependency_id,
                    ),
                )
                row = cur.fetchone()

        return dependency_row_to_dict(row)

    except HTTPException:
        raise

    except Exception as e:
        error_text = str(e).lower()

        if "duplicate key value" in error_text:
            raise HTTPException(status_code=400, detail="this dependency already exists")

        raise HTTPException(status_code=500, detail=f"db error: {e}")


@app.delete("/dependencies/{dependency_id}")
def delete_dependency(dependency_id: int):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    select
                        id,
                        source_component_id,
                        target_component_id,
                        dependency_type,
                        source_handle,
                        target_handle
                    from dependencies
                    where id = %s;
                    """,
                    (dependency_id,),
                )
                row = cur.fetchone()

                if not row:
                    raise HTTPException(status_code=404, detail="dependency not found")

                cur.execute(
                    """
                    delete from dependencies
                    where id = %s;
                    """,
                    (dependency_id,),
                )

        return {
            "message": "dependency deleted",
            "deleted_dependency_id": row[0],
            "source_component_id": row[1],
            "target_component_id": row[2],
            "dependency_type": row[3],
            "source_handle": row[4],
            "target_handle": row[5],
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"db error: {e}")


@app.post("/analysis/run", response_model=AnalysisResultOut)
def run_analysis(payload: AnalysisRunRequest):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    select id, name, component_type, description
                    from components
                    where id = %s;
                    """,
                    (payload.component_id,),
                )
                root_row = cur.fetchone()

                if not root_row:
                    raise HTTPException(status_code=404, detail="component not found")

                cur.execute(
                    """
                    select source_component_id, target_component_id
                    from dependencies
                    order by id;
                    """
                )
                dependency_rows = cur.fetchall()

                graph = build_adjacency(dependency_rows)
                affected_ids = collect_affected_ids(payload.component_id, graph)

                affected_components = []

                if affected_ids:
                    cur.execute(
                        """
                        select id, name, component_type, description
                        from components
                        where id = any(%s)
                        order by id;
                        """,
                        (affected_ids,),
                    )
                    affected_rows = cur.fetchall()

                    for row in affected_rows:
                        affected_components.append(component_row_to_dict(row))

        return {
            "root_component": component_row_to_dict(root_row),
            "affected_components": affected_components,
            "affected_count": len(affected_components),
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"db error: {e}")
