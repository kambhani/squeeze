"""Token Company API-based text compression."""

import os
from tokenc import TokenClient

class TokenCompressor:
    """
    Text compressor using The Token Company API.
    """

    def __init__(self, api_key: str = None):
        """
        Initialize the Token Company compressor.

        Args:
            api_key: API key for The Token Company. Falls back to TTC_API_KEY env var.
        """
        self.api_key = api_key or os.environ.get("TTC_API_KEY")
        if not self.api_key:
            raise ValueError("API key required. Set TTC_API_KEY env var or pass api_key.")
        self.client = TokenClient(api_key=self.api_key)

    def compress(self, text: str, data: dict = None) -> str:
        """
        Compress text using The Token Company API.

        Args:
            text: Input text to compress.
            data: Dictionary containing optional parameters:
                - aggressiveness: Compression aggressiveness (default: 0.5)
                - minTokens: Minimum number of tokens (default: None)
                - maxTokens: Maximum number of tokens (default: None)

        Returns:
            Compressed text.
        """
        if data is None:
            data = {}
        
        aggressiveness = data.get("aggressiveness", 0.5)
        min_tokens = data.get("minTokens", None)
        max_tokens = data.get("maxTokens", None)
        
        # Build the compress_input call with optional parameters
        compress_params = {
            "input": text,
            "aggressiveness": aggressiveness,
        }
        
        if min_tokens is not None:
            compress_params["min_tokens"] = min_tokens
        if max_tokens is not None:
            compress_params["max_tokens"] = max_tokens
        
        response = self.client.compress_input(**compress_params)
        return response.output
