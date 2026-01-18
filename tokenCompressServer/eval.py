"""
Evaluation module for compression quality assessment.

Provides tools to evaluate:
1. Semantic preservation - do compressed prompts produce same outputs?
2. Benchmark performance - accuracy on LongBench v2 dataset
"""

import argparse
import json
import os
from difflib import SequenceMatcher
from typing import Dict, List, Optional

from anthropic import Anthropic
from datasets import load_dataset

from compress import TokenCompressor
from utils import get_compression_stats


class CompressionEvaluator:
    """
    Evaluates semantic preservation of compressed prompts.
    Compares LLM outputs between original and compressed versions.
    """

    def __init__(self, api_key: str = None):
        """
        Initialize the evaluator.

        Args:
            api_key: Anthropic API key (defaults to ANTHROPIC_API_KEY env var)
        """
        if api_key is None:
            api_key = os.environ.get("ANTHROPIC_API_KEY")
        self.client = Anthropic(api_key=api_key)

    def test_preservation(
        self,
        original_prompt: str,
        compressed_prompt: str,
        model: str = "claude-sonnet-4-20250514"
    ) -> Dict:
        """
        Test if compressed prompt produces similar output as original.

        Args:
            original_prompt: Original prompt text
            compressed_prompt: Compressed prompt text
            model: Model to use for testing

        Returns:
            Dictionary with outputs and similarity score
        """
        # Get response with original
        orig_response = self.client.messages.create(
            model=model,
            max_tokens=1000,
            messages=[{"role": "user", "content": original_prompt}]
        )

        # Get response with compressed
        comp_response = self.client.messages.create(
            model=model,
            max_tokens=1000,
            messages=[{"role": "user", "content": compressed_prompt}]
        )

        orig_text = orig_response.content[0].text
        comp_text = comp_response.content[0].text

        return {
            "original_output": orig_text,
            "compressed_output": comp_text,
            "similarity": self._compare_outputs(orig_text, comp_text)
        }

    def _compare_outputs(self, output1: str, output2: str) -> float:
        """
        Compare similarity between two outputs.

        Args:
            output1: First output text
            output2: Second output text

        Returns:
            Similarity ratio between 0 and 1
        """
        return SequenceMatcher(None, output1, output2).ratio()

    def batch_evaluate(
        self,
        test_cases: List[Dict],
        model: str = "gpt-4"
    ) -> List[Dict]:
        """
        Evaluate multiple test cases.

        Args:
            test_cases: List of dicts with "original" and "compressed" fields
            model: Model to use for token counting

        Returns:
            List of evaluation results
        """
        results = []
        for case in test_cases:
            result = self.test_preservation(
                case["original"],
                case["compressed"]
            )
            result["compression_stats"] = get_compression_stats(
                case["original"],
                case["compressed"],
                model
            )
            results.append(result)
        return results


class LongBenchEvaluator:
    """
    Evaluates model performance on LongBench v2 dataset.
    Used to test if compression breaks comprehension on long-context tasks.
    """

    def __init__(self, api_key: str = None):
        """
        Initialize the evaluator.

        Args:
            api_key: Anthropic API key (defaults to ANTHROPIC_API_KEY env var)
        """
        if api_key is None:
            api_key = os.environ.get("ANTHROPIC_API_KEY")
        self.client = Anthropic(api_key=api_key)
        self.dataset = None

    def load_dataset(self, split: str = "train"):
        """
        Load the LongBench v2 dataset.

        Args:
            split: Dataset split to load
        """
        self.dataset = load_dataset("THUDM/LongBench-v2", split=split)

    def evaluate(
        self,
        model: str = "claude-sonnet-4-20250514",
        max_samples: Optional[int] = None,
        compressor: Optional[TokenCompressor] = None
    ) -> Dict:
        """
        Evaluate model accuracy on the dataset.

        Args:
            model: Model to use for evaluation
            max_samples: Maximum number of samples to evaluate
            compressor: Optional compressor to apply to contexts

        Returns:
            Dictionary with accuracy and detailed results
        """
        if self.dataset is None:
            self.load_dataset()

        results = []
        correct = 0
        total = 0

        dataset_to_eval = self.dataset
        if max_samples:
            dataset_to_eval = self.dataset.select(range(min(max_samples, len(self.dataset))))

        for i, item in enumerate(dataset_to_eval):
            prompt = self._format_prompt(item, compressor)

            response = self.client.messages.create(
                model=model,
                max_tokens=10,
                messages=[{"role": "user", "content": prompt}]
            ).content[0].text.strip()

            model_answer = self._extract_answer(response)
            is_correct = model_answer == item["answer"]

            if is_correct:
                correct += 1
            total += 1

            result = {
                "id": item["_id"],
                "question": item["question"],
                "model_answer": model_answer,
                "correct_answer": item["answer"],
                "is_correct": is_correct,
                "context_length": len(item["context"]),
            }

            if compressor:
                compressed_context = compressor.compress(item["context"])
                result["compressed_length"] = len(compressed_context)
                result["compression_ratio"] = len(compressed_context) / len(item["context"])

            results.append(result)
            print(f"Processed {i+1}/{len(dataset_to_eval)} - Accuracy: {correct/total:.2%}")

        accuracy = correct / total if total > 0 else 0
        return {"accuracy": accuracy, "results": results}

    def _format_prompt(self, item: Dict, compressor: Optional[TokenCompressor] = None) -> str:
        """
        Format a dataset item into a prompt.

        Args:
            item: Dataset item
            compressor: Optional compressor to apply to context

        Returns:
            Formatted prompt string
        """
        context = item["context"]
        if compressor:
            context = compressor.compress(context)

        return f"""Here is a document:

{context}

Based on the document, please answer the following multiple-choice question.

Question: {item['question']}

A) {item['choice_A']}
B) {item['choice_B']}
C) {item['choice_C']}
D) {item['choice_D']}

Please respond with only the letter of the correct answer (A, B, C, or D)."""

    def _extract_answer(self, response_text: str) -> Optional[str]:
        """
        Extract answer letter from response.

        Args:
            response_text: Model response

        Returns:
            Answer letter (A, B, C, D) or None
        """
        response_text = response_text.strip().upper()
        for char in response_text:
            if char in ["A", "B", "C", "D"]:
                return char
        return None


def evaluate_compression(
    original: str,
    compressed: str,
    api_key: str = None
) -> Dict:
    """
    Convenience function to evaluate a single compression.

    Args:
        original: Original text
        compressed: Compressed text
        api_key: Anthropic API key

    Returns:
        Dictionary with similarity and compression stats
    """
    evaluator = CompressionEvaluator(api_key)
    result = evaluator.test_preservation(original, compressed)
    result["compression_stats"] = get_compression_stats(original, compressed)
    return result


def main():
    parser = argparse.ArgumentParser(description="Evaluate compression quality")
    subparsers = parser.add_subparsers(dest="command", help="Evaluation command")

    # Preservation test subcommand
    preservation = subparsers.add_parser("preservation", help="Test semantic preservation")
    preservation.add_argument("--original", "-o", required=True, help="Original text or file path")
    preservation.add_argument("--compressed", "-c", required=True, help="Compressed text or file path")

    # LongBench evaluation subcommand
    longbench = subparsers.add_parser("longbench", help="Evaluate on LongBench v2")
    longbench.add_argument("--samples", "-n", type=int, default=5, help="Number of samples to evaluate")
    longbench.add_argument("--compress", action="store_true", help="Apply compression to contexts")
    longbench.add_argument("--method", choices=["rule", "ml", "hybrid"], default="rule",
                          help="Compression method to use")
    longbench.add_argument("--output", "-o", help="Output file for results (JSON)")

    args = parser.parse_args()

    if args.command == "preservation":
        # Load text from file if path exists
        original = args.original
        compressed = args.compressed
        if os.path.isfile(original):
            with open(original) as f:
                original = f.read()
        if os.path.isfile(compressed):
            with open(compressed) as f:
                compressed = f.read()

        result = evaluate_compression(original, compressed)
        print(json.dumps(result, indent=2))

    elif args.command == "longbench":
        evaluator = LongBenchEvaluator()
        print("Loading LongBench v2 dataset...")
        evaluator.load_dataset()

        compressor = None
        if args.compress:
            compressor = TokenCompressor(method=args.method)
            print(f"Using {args.method} compression")

        print(f"Evaluating {args.samples} samples...")
        results = evaluator.evaluate(max_samples=args.samples, compressor=compressor)

        if args.output:
            with open(args.output, "w") as f:
                json.dump(results, f, indent=2)
            print(f"Results saved to {args.output}")
        else:
            print(json.dumps(results, indent=2))

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
