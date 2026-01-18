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

    def compress(self, text: str, rate: float = 0.5, force_tokens: list = None) -> str:
        """
        Compress text using The Token Company API.

        Args:
            text: Input text to compress.
            rate: The target compression ratio (0-1). Maps to aggressiveness.
            force_tokens: Unused, kept for interface compatibility.

        Returns:
            Compressed text.
        """
        response = self.client.compress_input(
            input=text,
            aggressiveness=1.0 - rate,  # rate=0.5 means keep 50%, so aggressiveness=0.5
        )
        return response.output
