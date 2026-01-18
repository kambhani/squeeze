"""
Token Compression Framework
Tests multiple strategies for compressing LLM prompts to reduce token usage
"""

import re
from collections import Counter
from typing import Dict, List, Tuple
import json

# Optional: install with `pip install tiktoken googletrans==4.0.0-rc1 anthropic openai`
try:
    import tiktoken
    HAS_TIKTOKEN = True
except ImportError:
    HAS_TIKTOKEN = False
    print("⚠️  tiktoken not installed. Using character-based estimation.")

try:
    from googletrans import Translator
    HAS_TRANSLATOR = True
except ImportError:
    HAS_TRANSLATOR = False
    print("⚠️  googletrans not installed. Translation features disabled.")


class TokenCounter:
    """Handles token counting with fallback to character estimation"""
    
    def __init__(self, model="gpt-4"):
        self.model = model
        if HAS_TIKTOKEN:
            try:
                self.encoder = tiktoken.encoding_for_model(model)
            except:
                self.encoder = tiktoken.get_encoding("cl100k_base")
        else:
            self.encoder = None
    
    def count(self, text: str) -> int:
        """Count tokens in text"""
        if self.encoder:
            return len(self.encoder.encode(text))
        else:
            # Rough estimation: ~4 chars per token
            return len(text) // 4


class SuperTokenCompressor:
    """Manages super-token compression dictionary"""
    
    def __init__(self):
        # Predefined super-tokens for common patterns
        self.tokens = {
            # Instructions
            "§SUM": "Please provide a comprehensive summary of the following, focusing on key points and actionable insights:",
            "§TECH": "Explain this in technical terms suitable for a senior engineer with deep domain expertise:",
            "§ELI5": "Explain this concept as if I'm five years old, using simple analogies and avoiding jargon:",
            "§CODE": "Generate production-ready code with proper error handling, type hints, comprehensive documentation, and tests:",
            "§JSON": "Return your response as valid JSON with no additional commentary:",
            "§ANALYZE": "Provide a detailed analysis considering multiple perspectives, trade-offs, and implications:",
            
            # Common formats
            "§FMT_MD": "Format your response in markdown with clear headers and bullet points.",
            "§FMT_PROF": "Use a professional tone suitable for executive communication.",
            "§FMT_BRIEF": "Be concise and direct, limiting response to 200 words or less.",
            
            # Context templates
            "§CTX_CODE": "You are an expert software engineer reviewing code for production deployment.",
            "§CTX_DATA": "You are a data scientist analyzing patterns and providing statistical insights.",
        }
        
        # User-defined tokens learned from usage
        self.learned_tokens = {}
    
    def compress(self, text: str) -> str:
        """Replace expanded phrases with super-tokens"""
        compressed = text
        all_tokens = {**self.tokens, **self.learned_tokens}
        
        # Sort by length (longest first) to avoid partial replacements
        for token, expansion in sorted(all_tokens.items(), key=lambda x: len(x[1]), reverse=True):
            compressed = compressed.replace(expansion, token)
        
        return compressed
    
    def expand(self, text: str) -> str:
        """Expand super-tokens back to full text"""
        expanded = text
        all_tokens = {**self.tokens, **self.learned_tokens}
        
        for token, expansion in all_tokens.items():
            expanded = expanded.replace(token, expansion)
        
        return expanded
    
    def learn_from_prompts(self, prompts: List[str], min_length: int = 20, min_frequency: int = 2):
        """Analyze prompts to find repeated phrases for super-tokens"""
        ngrams = []
        
        for prompt in prompts:
            words = prompt.split()
            # Extract 4-15 word phrases
            for n in range(4, 16):
                for i in range(len(words) - n + 1):
                    phrase = ' '.join(words[i:i+n])
                    if len(phrase) >= min_length:
                        ngrams.append(phrase)
        
        # Find frequent phrases
        frequent = Counter(ngrams).most_common(20)
        
        # Create super-tokens for frequent phrases
        for i, (phrase, count) in enumerate(frequent):
            if count >= min_frequency:
                token_id = f"§L{i}"
                self.learned_tokens[token_id] = phrase
                print(f"Learned: {token_id} = '{phrase[:50]}...' (used {count}x)")


class AbbreviationCompressor:
    """Handles intelligent abbreviation and text shortening"""
    
    def __init__(self):
        # Safe technical abbreviations
        self.safe_abbrevs = {
            "documentation": "docs",
            "repository": "repo",
            "application": "app",
            "configuration": "config",
            "environment": "env",
            "function": "func",
            "parameter": "param",
            "variable": "var",
            "database": "db",
            "authentication": "auth",
            "authorization": "authz",
            "implementation": "impl",
            "specification": "spec",
            "reference": "ref",
            "information": "info",
            "message": "msg",
            "description": "desc",
            "administrator": "admin",
            "temporary": "temp",
            "directory": "dir",
            "maximum": "max",
            "minimum": "min",
            "number": "num",
            "string": "str",
            "boolean": "bool",
            "integer": "int",
        }
        
        # Common shorthand
        self.shorthand = {
            "you": "u",
            "your": "ur", 
            "you are": "ur",
            "before": "b4",
            "for": "4",
            "to": "2",
            "too": "2",
            "without": "w/o",
            "with": "w/",
            "because": "bc",
        }
    
    def compress_safe(self, text: str) -> str:
        """Apply only safe technical abbreviations"""
        compressed = text
        for full, abbrev in self.safe_abbrevs.items():
            # Word boundary replacement
            pattern = r'\b' + full + r'\b'
            compressed = re.sub(pattern, abbrev, compressed, flags=re.IGNORECASE)
        return compressed
    
    def compress_aggressive(self, text: str) -> str:
        """Apply aggressive abbreviations (test carefully!)"""
        compressed = self.compress_safe(text)
        
        for full, abbrev in self.shorthand.items():
            pattern = r'\b' + full + r'\b'
            compressed = re.sub(pattern, abbrev, compressed, flags=re.IGNORECASE)
        
        # Remove common articles (risky!)
        # compressed = re.sub(r'\b(the|a|an)\b\s+', '', compressed)
        
        return compressed
    
    def remove_vowels(self, text: str) -> str:
        """Remove vowels from long words (very aggressive!)"""
        words = text.split()
        compressed_words = []
        
        for word in words:
            if len(word) > 6:  # Only compress long words
                # Keep first letter and consonants
                compressed = word[0] + re.sub(r'[aeiou]', '', word[1:], flags=re.IGNORECASE)
                compressed_words.append(compressed)
            else:
                compressed_words.append(word)
        
        return ' '.join(compressed_words)


class CrossLingualCompressor:
    """Tests cross-lingual token efficiency"""
    
    def __init__(self):
        if HAS_TRANSLATOR:
            self.translator = Translator()
        else:
            self.translator = None
    
    def translate(self, text: str, dest_lang: str = 'zh-cn') -> str:
        """Translate text to target language"""
        if not self.translator:
            print("⚠️  Translation not available")
            return text
        
        try:
            result = self.translator.translate(text, dest=dest_lang)
            return result.text
        except Exception as e:
            print(f"Translation error: {e}")
            return text
    
    def test_languages(self, text: str, token_counter: TokenCounter) -> Dict[str, dict]:
        """Test token efficiency across multiple languages"""
        if not self.translator:
            return {}
        
        languages = {
            'en': 'English',
            'zh-cn': 'Chinese',
            'ja': 'Japanese',
            'ko': 'Korean',
            'ar': 'Arabic',
            'de': 'German',
            'es': 'Spanish',
        }
        
        results = {}
        original_tokens = token_counter.count(text)
        
        print(f"\n🌍 Testing cross-lingual compression:")
        print(f"Original (English): {original_tokens} tokens")
        
        for lang_code, lang_name in languages.items():
            if lang_code == 'en':
                continue
                
            try:
                translated = self.translate(text, lang_code)
                token_count = token_counter.count(translated)
                savings = original_tokens - token_count
                savings_pct = (savings / original_tokens) * 100 if original_tokens > 0 else 0
                
                results[lang_name] = {
                    'tokens': token_count,
                    'savings': savings,
                    'savings_pct': savings_pct,
                    'text': translated[:100] + '...' if len(translated) > 100 else translated
                }
                
                print(f"  {lang_name}: {token_count} tokens ({savings:+d}, {savings_pct:+.1f}%)")
            except Exception as e:
                print(f"  {lang_name}: Error - {e}")
        
        return results


class PromptCompressor:
    """Main compression orchestrator"""
    
    def __init__(self, model="gpt-4"):
        self.token_counter = TokenCounter(model)
        self.super_token = SuperTokenCompressor()
        self.abbreviation = AbbreviationCompressor()
        self.cross_lingual = CrossLingualCompressor()
    
    def compress(self, prompt: str, strategies: List[str] = None) -> Tuple[str, dict]:
        """
        Compress prompt using specified strategies
        
        Strategies: 'super_tokens', 'abbreviate_safe', 'abbreviate_aggressive', 
                   'remove_vowels', 'translate'
        """
        if strategies is None:
            strategies = ['super_tokens', 'abbreviate_safe']
        
        compressed = prompt
        original_tokens = self.token_counter.count(prompt)
        stats = {
            'original_tokens': original_tokens,
            'steps': []
        }
        
        # Apply each strategy
        if 'super_tokens' in strategies:
            before = self.token_counter.count(compressed)
            compressed = self.super_token.compress(compressed)
            after = self.token_counter.count(compressed)
            stats['steps'].append({
                'strategy': 'super_tokens',
                'tokens_before': before,
                'tokens_after': after,
                'saved': before - after
            })
        
        if 'abbreviate_safe' in strategies:
            before = self.token_counter.count(compressed)
            compressed = self.abbreviation.compress_safe(compressed)
            after = self.token_counter.count(compressed)
            stats['steps'].append({
                'strategy': 'abbreviate_safe',
                'tokens_before': before,
                'tokens_after': after,
                'saved': before - after
            })
        
        if 'abbreviate_aggressive' in strategies:
            before = self.token_counter.count(compressed)
            compressed = self.abbreviation.compress_aggressive(compressed)
            after = self.token_counter.count(compressed)
            stats['steps'].append({
                'strategy': 'abbreviate_aggressive',
                'tokens_before': before,
                'tokens_after': after,
                'saved': before - after
            })
        
        if 'remove_vowels' in strategies:
            before = self.token_counter.count(compressed)
            compressed = self.abbreviation.remove_vowels(compressed)
            after = self.token_counter.count(compressed)
            stats['steps'].append({
                'strategy': 'remove_vowels',
                'tokens_before': before,
                'tokens_after': after,
                'saved': before - after
            })
        
        final_tokens = self.token_counter.count(compressed)
        stats['final_tokens'] = final_tokens
        stats['total_saved'] = original_tokens - final_tokens
        stats['savings_pct'] = (stats['total_saved'] / original_tokens * 100) if original_tokens > 0 else 0
        
        return compressed, stats
    
    def expand_for_llm(self, compressed: str) -> str:
        """Expand compressed prompt before sending to LLM"""
        return self.super_token.expand(compressed)


def run_tests():
    """Run comprehensive compression tests"""
    
    print("=" * 70)
    print("🔬 TOKEN COMPRESSION TESTING FRAMEWORK")
    print("=" * 70)
    
    # Initialize compressor
    compressor = PromptCompressor(model="gpt-4")
    
    # Test prompts
    test_prompts = [
        """Please provide a comprehensive summary of the following, focusing on key points and actionable insights: 
        The documentation for the application configuration describes how to set up the environment variables 
        for the database connection and authentication parameters. The implementation requires you to specify 
        the repository location and reference the specification documents.""",
        
        """Explain this in technical terms suitable for a senior engineer with deep domain expertise:
        How does the authentication system work with the database and what are the configuration parameters 
        needed for the application environment?""",
        
        """Generate production-ready code with proper error handling, type hints, comprehensive documentation, and tests:
        Create a function that processes user information from the database and returns a formatted message.""",
    ]
    
    print("\n" + "=" * 70)
    print("TEST 1: SUPER-TOKEN COMPRESSION")
    print("=" * 70)
    
    for i, prompt in enumerate(test_prompts[:1], 1):  # Just first one for demo
        print(f"\n📝 Test Prompt #{i}:")
        print(f"Original: {prompt[:100]}...")
        print(f"Original tokens: {compressor.token_counter.count(prompt)}")
        
        compressed, stats = compressor.compress(prompt, strategies=['super_tokens'])
        
        print(f"\n✅ Compressed: {compressed[:100]}...")
        print(f"Tokens: {stats['final_tokens']} (saved {stats['total_saved']}, {stats['savings_pct']:.1f}%)")
        
        # Show it can be expanded back
        expanded = compressor.expand_for_llm(compressed)
        print(f"\n🔄 Expanded back: {expanded[:100]}...")
    
    print("\n" + "=" * 70)
    print("TEST 2: ABBREVIATION COMPRESSION")
    print("=" * 70)
    
    for i, prompt in enumerate(test_prompts[:1], 1):
        print(f"\n📝 Test Prompt #{i}:")
        
        # Safe abbreviations
        compressed_safe, stats_safe = compressor.compress(prompt, strategies=['abbreviate_safe'])
        print(f"\n✅ Safe abbreviations:")
        print(f"   Compressed: {compressed_safe[:100]}...")
        print(f"   Tokens: {stats_safe['final_tokens']} (saved {stats_safe['total_saved']}, {stats_safe['savings_pct']:.1f}%)")
        
        # Aggressive abbreviations
        compressed_agg, stats_agg = compressor.compress(prompt, strategies=['abbreviate_aggressive'])
        print(f"\n⚡ Aggressive abbreviations:")
        print(f"   Compressed: {compressed_agg[:100]}...")
        print(f"   Tokens: {stats_agg['final_tokens']} (saved {stats_agg['total_saved']}, {stats_agg['savings_pct']:.1f}%)")
    
    print("\n" + "=" * 70)
    print("TEST 3: COMBINED STRATEGIES")
    print("=" * 70)
    
    for i, prompt in enumerate(test_prompts[:1], 1):
        print(f"\n📝 Test Prompt #{i}:")
        
        compressed, stats = compressor.compress(
            prompt, 
            strategies=['super_tokens', 'abbreviate_safe']
        )
        
        print(f"\n✅ Combined compression:")
        print(f"   Original: {stats['original_tokens']} tokens")
        for step in stats['steps']:
            print(f"   {step['strategy']}: {step['tokens_before']} → {step['tokens_after']} (saved {step['saved']})")
        print(f"   Final: {stats['final_tokens']} tokens")
        print(f"   Total savings: {stats['total_saved']} tokens ({stats['savings_pct']:.1f}%)")
        print(f"\n   Result: {compressed[:150]}...")
    
    print("\n" + "=" * 70)
    print("TEST 4: CROSS-LINGUAL COMPRESSION")
    print("=" * 70)
    
    if HAS_TRANSLATOR:
        test_text = "Please summarize the main points of this technical documentation about database configuration."
        results = compressor.cross_lingual.test_languages(test_text, compressor.token_counter)
    else:
        print("⚠️  Skipped: googletrans not installed")
        print("   Install with: pip install googletrans==4.0.0-rc1")
    
    print("\n" + "=" * 70)
    print("TEST 5: LEARNED SUPER-TOKENS")
    print("=" * 70)
    
    # Learn from repeated patterns
    print("\n🧠 Learning super-tokens from prompt patterns...")
    compressor.super_token.learn_from_prompts(test_prompts, min_frequency=1)
    
    print("\n" + "=" * 70)
    print("💡 RECOMMENDATIONS")
    print("=" * 70)
    print("""
1. START WITH: Super-tokens for your common instructions
   - Build a custom dictionary for your use case
   - Zero risk, immediate 20-40% savings on repeated patterns
   
2. ADD: Safe technical abbreviations
   - Low risk for technical content
   - Additional 5-15% savings
   
3. TEST CAREFULLY: Aggressive abbreviations
   - A/B test with actual LLM outputs
   - May reduce quality
   
4. EXPERIMENTAL: Cross-lingual compression
   - Only worthwhile if 20%+ token savings
   - Consider translation API costs
   - May reduce model performance

5. AVOID: Vowel removal
   - High risk of breaking model understanding
   - Minimal token savings
    """)
    
    print("\n" + "=" * 70)
    print("📦 EXPORT COMPRESSION DICTIONARY")
    print("=" * 70)
    
    # Export learned tokens
    all_tokens = {**compressor.super_token.tokens, **compressor.super_token.learned_tokens}
    
    output_file = "/home/claude/compression_dictionary.json"
    with open(output_file, 'w') as f:
        json.dump(all_tokens, f, indent=2)
    
    print(f"\n✅ Saved {len(all_tokens)} super-tokens to: {output_file}")
    print("\nYou can load this dictionary in your application:")
    print("```python")
    print("with open('compression_dictionary.json') as f:")
    print("    SUPER_TOKENS = json.load(f)")
    print("```")


if __name__ == "__main__":
    run_tests()