from pathlib import Path
import sys
import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.main import app

contract = yaml.safe_load((ROOT / "contract/openapirest.yml").read_text(encoding="utf-8"))
generated = app.openapi()
errors = []

if generated.get("security") != contract.get("security"):
    errors.append("El requisito bearer global no coincide")
if generated.get("servers") != contract.get("servers"):
    errors.append("Los servidores HTTPS no coinciden")

for path, operations in contract["paths"].items():
    if path not in generated["paths"]:
        errors.append(f"Falta la ruta {path} en FastAPI")
        continue
    for method, operation in operations.items():
        actual = generated["paths"][path].get(method)
        if actual is None:
            errors.append(f"Falta {method.upper()} {path} en FastAPI")
            continue
        if actual.get("operationId") != operation.get("operationId"):
            errors.append(f"{method.upper()} {path}: operationId no coincide")
        expected_codes = set(operation["responses"])
        actual_codes = set(actual["responses"])
        if expected_codes != actual_codes:
            errors.append(f"{method.upper()} {path}: respuestas contrato={sorted(expected_codes)}, FastAPI={sorted(actual_codes)}")
        parameter_components = contract["components"]["parameters"]
        def resolve_parameter(parameter):
            if "$ref" in parameter:
                return parameter_components[parameter["$ref"].split("/")[-1]]
            return parameter
        expected_params = {
            (p["name"], p["in"]) for p in map(resolve_parameter, operation.get("parameters", []))
        }
        actual_params = {
            (p["name"], p["in"]) for p in actual.get("parameters", [])
        }
        if expected_params != actual_params:
            errors.append(f"{method.upper()} {path}: parámetros contrato={sorted(expected_params)}, FastAPI={sorted(actual_params)}")

contract_ticket = set(contract["components"]["schemas"]["Ticket"]["properties"])
actual_ticket = set(generated["components"]["schemas"]["Ticket"]["properties"])
if contract_ticket != actual_ticket:
    errors.append(f"Ticket properties no coinciden: contrato={sorted(contract_ticket)}, FastAPI={sorted(actual_ticket)}")

for path, operations in contract["paths"].items():
    for method, operation in operations.items():
        actual = generated["paths"].get(path, {}).get(method, {})
        for code, response in operation["responses"].items():
            if "application/problem+json" in response.get("content", {}):
                media = actual.get("responses", {}).get(code, {}).get("content", {})
                if "application/problem+json" not in media or "application/json" in media:
                    errors.append(f"{method.upper()} {path} {code}: media type Problem Details no coincide")

if errors:
    print("CONTRACT CHECK FAILED")
    print("\n".join(f"- {error}" for error in errors))
    raise SystemExit(1)

print("CONTRACT CHECK PASSED: rutas, operaciones, parámetros, respuestas y Ticket coinciden.")
