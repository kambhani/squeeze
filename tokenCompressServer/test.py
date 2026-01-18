import tiktoken

def test_abbreviation_strategies():
    tokenizer = tiktoken.encoding_for_model("gpt-4")
    
    test_cases = [
        # Original vs abbreviated
        ("before", "b4"),
        ("you", "u"), 
        ("your", "ur"),
        ("because", "bc"),
        ("without", "w/o"),
        ("document", "doc"),
        # Vowel removal
        ("document", "dcmnt"),
        ("analysis", "nlysis"),
        ("function", "fnctn"),
    ]
    
    results = []
    for original, abbrev in test_cases:
        orig_tokens = len(tokenizer.encode(original))
        abbrev_tokens = len(tokenizer.encode(abbrev))
        
        # Critical: test if model understands
        quality = test_model_understanding(original, abbrev)
        
        results.append({
            "original": original,
            "abbrev": abbrev,
            "token_saved": orig_tokens - abbrev_tokens,
            "quality_preserved": quality
        })
    
    return results

def test_model_understanding(original, abbrev):
    """Test if abbreviated version produces similar output"""
    prompt_orig = f"Define the word: {original}"
    prompt_abbrev = f"Define the word: {abbrev}"
    
    response_orig = llm_call(prompt_orig)
    response_abbrev = llm_call(prompt_abbrev)
    
    # Compare semantic similarity
    return semantic_similarity(response_orig, response_abbrev)