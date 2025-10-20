from __future__ import annotations

import mimetypes
import os
from typing import Any, Dict

from flask import Flask, jsonify, render_template, request
from werkzeug.exceptions import RequestEntityTooLarge

from services.extractor import ExtractionError, extract_text


app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50 MB


@app.get("/")
def index() -> str:
    """Render the main application page."""
    return render_template("index.html")


@app.post("/api/extract")
def api_extract() -> Any:
    """Extract text from an uploaded document and return JSON."""
    if "file" not in request.files:
        return jsonify({"ok": False, "error": "Aucun fichier fourni."}), 400

    uploaded_file = request.files["file"]

    if uploaded_file.filename == "":
        return jsonify({"ok": False, "error": "Nom de fichier invalide."}), 400

    filename = os.path.basename(uploaded_file.filename)
    _, ext = os.path.splitext(filename)

    if not ext:
        return jsonify({"ok": False, "error": "Extension de fichier manquante."}), 400

    ext = ext.lower()
    allowed_ext = {".pdf", ".epub", ".docx", ".txt"}

    if ext not in allowed_ext:
        return (
            jsonify(
                {
                    "ok": False,
                    "error": "Format non supporté. Formats acceptés : PDF, EPUB, DOCX, TXT.",
                }
            ),
            400,
        )

    try:
        text = extract_text(uploaded_file, ext)
    except ExtractionError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400
    except Exception as exc:  # pragma: no cover - guard against unexpected failures
        return jsonify({"ok": False, "error": f"Erreur interne : {exc}"}), 500

    response: Dict[str, Any] = {
        "ok": True,
        "text": text,
        "meta": {
            "filename": filename,
            "format": ext.lstrip("."),
            "length": len(text),
            "mimetype": mimetypes.types_map.get(ext, "application/octet-stream"),
        },
    }
    return jsonify(response)


@app.errorhandler(RequestEntityTooLarge)
def handle_file_too_large(_: RequestEntityTooLarge) -> Any:
    """Return a JSON error when the uploaded file exceeds the limit."""
    if request.path.startswith("/api/"):
        return (
            jsonify(
                {
                    "ok": False,
                    "error": "Le fichier dépasse la limite de 50 Mo.",
                }
            ),
            413,
        )
    return ("Fichier trop volumineux.", 413)


if __name__ == "__main__":
    app.run(debug=True)
