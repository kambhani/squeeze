"""
Unified Token Compression Module

Provides both rule-based and ML-based compression methods for reducing
token counts in LLM prompts while preserving semantic meaning.
"""

import os
import sys
from typing import Dict, List, Tuple

from rule_compressor import RuleBasedCompressor
from ml_compressor import MLCompressor
from utils import get_compression_stats


# Re-export for convenience
__all__ = ["RuleBasedCompressor", "MLCompressor", "TokenCompressor"]


class TokenCompressor:
    """
    Unified interface for token compression.
    Supports rule-based or ML-based compression methods.
    """

    def __init__(self, method: str = "rule"):
        """
        Initialize the compressor.

        Args:
            method: Compression method - "rule" or "ml"
        """
        self.method = method

        if method == "rule":
            self._compressor = RuleBasedCompressor()
        elif method == "ml":
            self._compressor = MLCompressor()
        else:
            raise ValueError(f"Unknown method: {method}. Use 'rule' or 'ml'")

    def compress(self, text: str) -> str:
        """
        Compress text using the configured method.

        Args:
            text: Input text to compress

        Returns:
            Compressed text
        """
        return self._compressor.compress(text)

    def get_stats(self, original: str, compressed: str, model: str = "gpt-4") -> Dict:
        """
        Get compression statistics.

        Args:
            original: Original text
            compressed: Compressed text
            model: Model to use for token counting

        Returns:
            Dictionary with compression statistics
        """
        return get_compression_stats(original, compressed, model)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Usage: python compress.py "single prompt text"')
        print("   or: python compress.py tests.txt")
        sys.exit(1)

    input_arg = sys.argv[1]
    rule_compressor = TokenCompressor(method="rule")
    ml_compressor = TokenCompressor(method="ml")

    def load_prompts(path: str) -> List[str]:
        with open(path, "r", encoding="utf-8") as handle:
            content = handle.read()
        return [p.strip() for p in content.split("\n\n") if p.strip()]

    def summarize_stats(stats_list: List[Dict]) -> Dict:
        total_original = sum(s["original_tokens"] for s in stats_list)
        total_compressed = sum(s["compressed_tokens"] for s in stats_list)
        total_saved = sum(s["tokens_saved"] for s in stats_list)
        avg_ratio = (
            sum(s["compression_ratio"] for s in stats_list) / len(stats_list)
            if stats_list
            else 1.0
        )
        avg_percent_saved = (
            sum(s["percentage_saved"] for s in stats_list) / len(stats_list)
            if stats_list
            else 0.0
        )
        return {
            "prompts": len(stats_list),
            "original_tokens": total_original,
            "compressed_tokens": total_compressed,
            "tokens_saved": total_saved,
            "avg_compression_ratio": avg_ratio,
            "avg_percentage_saved": avg_percent_saved,
        }

    if os.path.isfile(input_arg):
        prompts = load_prompts(input_arg)
        rule_stats_list: List[Dict] = []
        ml_stats_list: List[Dict] = []

        for original in prompts:
            rule_compressed = rule_compressor.compress(original)
            rule_stats_list.append(rule_compressor.get_stats(original, rule_compressed))

            ml_compressed = ml_compressor.compress(original)
            ml_stats_list.append(ml_compressor.get_stats(original, ml_compressed))

        print(f"File: {input_arg}")
        print("--- Rule-Based Summary ---")
        print(summarize_stats(rule_stats_list))
        print("--- ML-Based (LLMLingua) Summary ---")
        print(summarize_stats(ml_stats_list))
    else:
        original = input_arg
        rule_compressed = rule_compressor.compress(original)
        rule_stats = rule_compressor.get_stats(original, rule_compressed)

        ml_compressed = ml_compressor.compress(original)
        ml_stats = ml_compressor.get_stats(original, ml_compressed)

        print(f"Original: {original}")
        print("--- Rule-Based ---")
        print(f"Compressed: {rule_compressed}")
        print(f"Stats: {rule_stats}")
        print("--- ML-Based (LLMLingua) ---")
        print(f"Compressed: {ml_compressed}")
        print(f"Stats: {ml_stats}")
