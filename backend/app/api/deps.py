from fastapi import Query


def store_id_query(store_id: str = Query(..., description="Store UUID")) -> str:
    return store_id
