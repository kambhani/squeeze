from flask import Flask, jsonify, request
from flask_cors import CORS

from ml_compressor import MLCompressor
from utils import get_compression_stats

app = Flask(__name__)
CORS(app)

# Initialize once to avoid reloading the model per request.
_compressor = MLCompressor()


@app.post("/compress")
def compress_text():
    payload = request.get_json(silent=True) or {}
    text = payload.get("text")
    if not isinstance(text, str) or not text.strip():
        return jsonify({"error": "Field 'text' is required and must be a non-empty string."}), 400

    rate = payload.get("rate", 0.5)
    if not isinstance(rate, (int, float)) or not (0 < float(rate) <= 1):
        return jsonify({"error": "Field 'rate' must be a number in the range (0, 1]."}), 400

    force_tokens = payload.get("force_tokens")
    if force_tokens is not None and not isinstance(force_tokens, list):
        return jsonify({"error": "Field 'force_tokens' must be a list of strings."}), 400

    try:
        compressed = _compressor.compress(
            text=text,
            rate=float(rate),
            force_tokens=force_tokens,
        )
    except Exception as exc:  # pylint: disable=broad-except
        return jsonify({"error": f"Compression failed: {exc}"}), 500

    stats = get_compression_stats(text, compressed)
    return jsonify(
        {
            "compressed": compressed,
            "rate": float(rate),
            "force_tokens": force_tokens,
            "input_tokens": stats["original_tokens"],
            "output_tokens": stats["compressed_tokens"],
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
