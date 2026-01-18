"""Token counting utilities for compression analysis."""

import tiktoken
from anthropic import Anthropic


def count_tokens(text: str, model: str = "gpt-4", api_key: str = None) -> int:
    """
    Count tokens in text for a given model.

    Args:
        text: The text to count tokens for
        model: Model name (gpt-4, gpt-3.5-turbo, claude-*, etc.)
        api_key: Anthropic API key (required for Claude models)

    Returns:
        Number of tokens in the text
    """
    if "gpt" in model.lower():
        enc = tiktoken.encoding_for_model(model)
        return len(enc.encode(text))
    elif "claude" in model.lower():
        if api_key is None:
            import os
            api_key = os.environ.get("ANTHROPIC_API_KEY")
        client = Anthropic(api_key=api_key)
        return client.count_tokens(text)
    else:
        # Default to GPT-4 tokenizer as fallback
        enc = tiktoken.encoding_for_model("gpt-4")
        return len(enc.encode(text))


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
    orig_tokens = count_tokens(original, model)
    comp_tokens = count_tokens(compressed, model)

    return {
        "original_tokens": orig_tokens,
        "compressed_tokens": comp_tokens,
        "tokens_saved": orig_tokens - comp_tokens,
        "compression_ratio": comp_tokens / orig_tokens if orig_tokens > 0 else 1.0,
        "percentage_saved": (1 - comp_tokens / orig_tokens) * 100 if orig_tokens > 0 else 0.0
    }
