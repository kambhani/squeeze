from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Squeeze Compression API", version="1.0.0")

# Enable CORS for VS Code extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CompressionRequest(BaseModel):
    text: str
    model: str


class CompressionResponse(BaseModel):
    compressedText: str
    inputTokens: int
    outputTokens: int


def estimate_tokens(text: str) -> int:
    """Simple token estimation: ~4 characters per token."""
    return len(text) // 4


@app.post("/compress", response_model=CompressionResponse)
async def compress(request: CompressionRequest):
    """
    Compression endpoint that takes text and model, returns compressed text and token counts.
    """
    try:
        # Simple compression: truncate to 50% for MVP (replace with actual compression logic)
        compressed = request.text[:len(request.text) // 2] if len(request.text) > 10 else request.text
        
        input_tokens = estimate_tokens(request.text)
        output_tokens = estimate_tokens(compressed)
        
        return CompressionResponse(
            compressedText=compressed,
            inputTokens=input_tokens,
            outputTokens=output_tokens
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compression error: {str(e)}")


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "squeeze-compression-api"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
