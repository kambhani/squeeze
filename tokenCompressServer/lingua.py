"""LLMLingua-based text compression."""

from llmlingua import PromptCompressor
import torch


class LinguaCompressor:
    """
    Text compressor using the pre-trained LLMLingua model.
    """

    def __init__(self, model_name: str = "microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank"):
        """
        Initialize the LLMLingua compressor.

        Args:
            model_name: Hugging Face model name for LLMLingua.
        """
        device = "mps" if torch.backends.mps.is_available() else "cpu"
        self.compressor = PromptCompressor(model_name, device_map=device, use_llmlingua2=True)

    def compress(self, text: str, data: dict = None) -> str:
        """
        Compress text using the LLMLingua model.

        Args:
            text: Input text to compress.
            data: Dictionary containing optional parameters:
                - rate: The target compression ratio (default: 0.5)
                - force_tokens: A list of tokens to force-keep in the compressed prompt (default: None)

        Returns:
            Compressed text.
        """
        if data is None:
            data = {}
        
        rate = data.get("rate", 0.5)
        force_tokens = data.get("force_tokens", None)
        
        if force_tokens is None:
            force_tokens = ["\n", ".", "?", "!"]

        result = self.compressor.compress_prompt(
            text,
            rate=rate,
            force_tokens=force_tokens
        )
        return result['compressed_prompt']
