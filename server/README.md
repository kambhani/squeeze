# Squeeze Compression Server

FastAPI server for compressing text tokens.

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

Compresses the provided text and returns token counts.

**Request Body:**
```json
{
  "text": "string (text to compress)",
  "model": "string (compression model name)"
}
```

**Response:**
```json
{
  "compressedText": "string (compressed text)",
  "inputTokens": 123,
  "outputTokens": 45
}
```

### GET /health

Health check endpoint.

## Development

The server currently implements a simple compression that truncates text to 50% for MVP. Replace the compression logic in `main.py` with your actual compression algorithm.
