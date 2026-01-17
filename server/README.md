# Squeeze Compression Server

FastAPI server for compressing chat context before sending to LLMs.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the server:
```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The server will start on `http://localhost:8000`

## API Endpoints

### POST /compress

Compresses the provided content. Currently returns first 10 characters of each input for testing.

**Request Body:**
```json
{
  "model": "string",
  "prompt": "string (optional)",
  "files": [
    {
      "path": "string",
      "content": "string"
    }
  ],
  "terminal": "string (optional)"
}
```

**Response:**
```json
{
  "compressedPrompt": "string (optional)",
  "compressedFiles": [
    {
      "path": "string",
      "content": "string"
    }
  ],
  "compressedTerminal": "string (optional)",
  "compressed": null,
  "error": null
}
```

### GET /health

Health check endpoint.

## Development

The server currently implements a test compression that returns the first 10 characters of each input. Replace the `truncate_to_10_chars` logic in `main.py` with your actual compression algorithm.
