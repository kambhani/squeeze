from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

app = FastAPI(title="Squeeze Compression API", version="1.0.0")

# Enable CORS for VS Code extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class FileContent(BaseModel):
    path: str
    content: str


class CompressionRequest(BaseModel):
    model: str
    prompt: Optional[str] = None
    files: Optional[List[FileContent]] = None
    terminal: Optional[str] = None


class CompressedFileContent(BaseModel):
    path: str
    content: str


class CompressionResponse(BaseModel):
    compressedPrompt: Optional[str] = None
    compressedFiles: Optional[List[CompressedFileContent]] = None
    compressedTerminal: Optional[str] = None
    compressed: Optional[dict] = None
    error: Optional[str] = None


def truncate_to_10_chars(text: str) -> str:
    """Truncate text to first 10 characters for testing."""
    return text[:10] if text else ""


@app.post("/compress", response_model=CompressionResponse)
async def compress(request: CompressionRequest):
    """
    Compression endpoint that returns first 10 characters of each input for testing.
    """
    try:
        response = CompressionResponse()

        # Compress prompt (first 10 chars)
        if request.prompt:
            response.compressedPrompt = truncate_to_10_chars(request.prompt)

        # Compress files (first 10 chars of each file)
        if request.files:
            response.compressedFiles = [
                CompressedFileContent(
                    path=file.path,
                    content=truncate_to_10_chars(file.content)
                )
                for file in request.files
            ]

        # Compress terminal output (first 10 chars)
        if request.terminal:
            response.compressedTerminal = truncate_to_10_chars(request.terminal)

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compression error: {str(e)}")


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "squeeze-compression-api"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
