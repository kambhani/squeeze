from flask import Flask, jsonify, request
from flask_cors import CORS
import tiktoken

from lingua import LinguaCompressor
from token_compressor import TokenCompressor
from dotenv import load_dotenv
load_dotenv()


def get_compression_stats(original: str, compressed: str, model: str = "gpt-4") -> dict:
    """
    Calculate compression statistics between original and compressed text.

    Args:
        original: Original text
        compressed: Compressed text
        model: Model to use for token counting

    Returns:
        Dictionary with compression statistics
    """
    enc = tiktoken.encoding_for_model(model)
    orig_tokens = len(enc.encode(original))
    comp_tokens = len(enc.encode(compressed))

    return {
        "original_tokens": orig_tokens,
        "compressed_tokens": comp_tokens,
        "tokens_saved": orig_tokens - comp_tokens,
        "compression_ratio": comp_tokens / orig_tokens if orig_tokens > 0 else 1.0,
        "percentage_saved": (1 - comp_tokens / orig_tokens) * 100 if orig_tokens > 0 else 0.0
    }

app = Flask(__name__)
CORS(app)

# Initialize compressors once to avoid reloading per request.
_compressors = {
    "lingua": LinguaCompressor(),
    "tokenc": TokenCompressor(),
}


@app.post("/transform")
def compress_text():
    payload = request.get_json(silent=True) or {}
    print(payload)

    text = payload.get("text")
    if not isinstance(text, str) or not text.strip():
        return jsonify({"error": "Field 'text' is required and must be a non-empty string."}), 400

    scheme = payload.get("scheme", "lingua")
    if scheme not in _compressors:
        return jsonify({"error": f"Invalid scheme '{scheme}'. Must be one of: {list(_compressors.keys())}"}), 400

    # Get data field (dictionary) - defaults to empty dict if not provided
    data = payload.get("data", {})
    if not isinstance(data, dict):
        return jsonify({"error": "Field 'data' must be a dictionary."}), 400

    try:
        compressor = _compressors[scheme]
        compressed = compressor.compress(text=text, data=data)
    except Exception as exc:  # pylint: disable=broad-except
        return jsonify({"error": f"Compression failed: {exc}"}), 500

    stats = get_compression_stats(text, compressed)
    return jsonify(
        {
            "compressed": compressed,
            "input_tokens": stats["original_tokens"],
            "output_tokens": stats["compressed_tokens"],
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
