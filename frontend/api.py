import os
from pathlib import Path

import requests
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")

def get_components():
    response = requests.get(f"{API_BASE_URL}/components", timeout=10)
    response.raise_for_status()
    return response.json()

def get_dependencies():
    response = requests.get(f"{API_BASE_URL}/dependencies", timeout=10)
    response.raise_for_status()
    return response.json()

def run_analysis(component_id: int):
    response = requests.post(
        f"{API_BASE_URL}/analysis/run",
        json={"component_id": component_id},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()

def create_component(name: str, component_type: str, description: str | None = None):
    payload = {
        "name": name,
        "component_type": component_type,
        "description": description,
    }

    response = requests.post(f"{API_BASE_URL}/components", json=payload, timeout=10)
    response.raise_for_status()
    return response.json()

def create_dependency(source_component_id: int, target_component_id: int, dependency_type: str = "hard"):
    payload = {
        "source_component_id": source_component_id,
        "target_component_id": target_component_id,
        "dependency_type": dependency_type,
    }

    response = requests.post(f"{API_BASE_URL}/dependencies", json=payload, timeout=10)
    response.raise_for_status()
    return response.json()

def delete_component_by_id(component_id: int):
    response = requests.delete(f"{API_BASE_URL}/components/{component_id}", timeout=10)
    response.raise_for_status()
    return response.json()

def delete_dependency_by_id(dependency_id: int):
    response = requests.delete(f"{API_BASE_URL}/dependencies/{dependency_id}", timeout=10)
    response.raise_for_status()
    return response.json()

def update_component_by_id(component_id: int, name: str, component_type: str, description: str | None = None):
    payload = {
        "name": name,
        "component_type": component_type,
        "description": description,
    }

    response = requests.put(f"{API_BASE_URL}/components/{component_id}", json=payload, timeout=10)
    response.raise_for_status()
    return response.json()