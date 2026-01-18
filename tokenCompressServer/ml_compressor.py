"""ML-based text compression using LLMLingua."""

from llmlingua import PromptCompressor
import torch

class MLCompressor:
    """
    ML-based text compressor using the pre-trained LLMLingua model.
    """

    def __init__(self, model_name: str = "microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank"):
        """
        Initialize the ML compressor.

        Args:
            model_name: Hugging Face model name for LLMLingua.
        """
        # Auto-detect device (MPS for Apple Silicon, CPU otherwise)
        device = "mps" if torch.backends.mps.is_available() else "cpu"
        self.compressor = PromptCompressor(model_name, device_map=device, use_llmlingua2=True)

    def compress(self, text: str, rate: float = 0.5, force_tokens: list = None) -> str:
        """
        Compress text using the LLMLingua model.

        Args:
            text: Input text to compress.
            rate: The target compression ratio.
            force_tokens: A list of tokens to force-keep in the compressed prompt.

        Returns:
            Compressed text.
        """
        if force_tokens is None:
            force_tokens = ["\n", ".", "?", "!"]

        result = self.compressor.compress_prompt(
            text,
            rate=rate,
            force_tokens=force_tokens
        )
        return result['compressed_prompt']
