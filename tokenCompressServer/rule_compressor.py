"""Rule-based text compression using predefined patterns and replacements."""

import re


class RuleBasedCompressor:
    """
    Rule-based text compressor using predefined patterns and replacements.
    Fast and deterministic, no training required.
    """

    def __init__(self):
        self.replacements = {
            # Common verbose phrases
            "in order to": "to",
            "due to the fact that": "because",
            "at this point in time": "now",
            "for the purpose of": "for",
            "in the event that": "if",
            "with regard to": "regarding",
            "in spite of the fact that": "although",
            "on the basis of": "based on",

            # Technical shortcuts
            "artificial intelligence": "AI",
            "machine learning": "ML",
            "natural language processing": "NLP",
            "large language model": "LLM",
            "application programming interface": "API",
        }

        self.filler_words = {
            "actually", "basically", "essentially", "literally",
            "very", "really", "quite", "rather", "somewhat"
        }
        self.rule_groups = [
            {
                "name": "remove_fillers",
                "enabled": True,
                "patterns": [
                    (r"\b(please|thank you|just wondering|i would like to know|can you please)\b", ""),
                    (r"\b(i|we|you|they)\s+(think|believe|feel|wonder|hope|wish)\s+that\b", ""),
                    (r"\b(it|this|that)\s+(is|was|seems)\s+(to be|like)\b", ""),
                ],
            },
            {
                "name": "remove_greetings",
                "enabled": True,
                "patterns": [
                    (r"\b(hi|hello|hey|greetings|good (morning|afternoon|evening))\b", ""),
                ],
            },
            {
                "name": "strip_modifiers",
                "enabled": True,
                "patterns": [
                    (r"\b(really|very|quite|extremely|highly|somewhat|rather|fairly|pretty)\s+", ""),
                    (r"\b(i think|honestly speaking|actually|basically|essentially|practically|i mean|you know|like|sort of|kind of)\b", ""),
                    (r"\b(in my opinion|from my perspective|as far as i can tell|as i see it)\b", ""),
                ],
            },
            {
                "name": "collapse_phrases",
                "enabled": True,
                "patterns": [
                    (r"\b(utilize|utilise)\b", "use"),
                    (r"\b(terminate|cease|discontinue)\b", "end"),
                    (r"\b(assist with|aid in|help with)\b", "help"),
                    (r"\b(in order to|so as to|for the purpose of)\b", "to"),
                    (r"\b(due to|owing to|on account of|because of) the fact that\b", "because"),
                    (r"\b(make|come to) a decision\b", "decide"),
                    (r"\b(take|give) (into )?consideration\b", "consider"),
                    (r"\b(at this point|at the present time|currently)\b", "now"),
                    (r"\b(would like to|wish to|desire to)\b", "want to"),
                    (r"\b(in terms of|with regard to|regarding|concerning)\b", "about"),
                    (r"\b(the (way|manner) in which)\b", "how"),
                    (r"\b(despite|in spite of) the fact that\b", "although"),
                    (r"\b(in the event that|in case)\b", "if"),
                    (r"\b(could|would|can) you (explain|tell me about|describe|share|show|help me understand)\b", "explain"),
                    (r"\b(what is|tell me|describe) the (difference|distinction) between\b", "compare"),
                    (r"\b(how does|in what way|by what means)\b", "how"),
                    (r"\b(what are|list|name) the (benefits|advantages|pros)\b", "benefits of"),
                    (r"\b(what are|list|name) the (drawbacks|disadvantages|cons)\b", "drawbacks of"),
                ],
            },
            {
                "name": "punctuation_compression",
                "enabled": True,
                "patterns": [
                    (r"\s*[,;]\s*(?:and|or)\s+", " "),
                    (r"(?<!\.)\.\.\.", ""),
                    (r"\s*[,;]\s*(?=\band\b|\bor\b)", " "),
                    (r"\([^)]*\)\s*[,;]?", ""),
                    (r"([.,!?])\s*([.,!?])+", r"\1"),
                    (r"\s+([.,!?])", r"\1"),
                    (r"([.,!?])\s+", r"\1 "),
                ],
            },
            {
                "name": "sentence_compression",
                "enabled": True,
                "patterns": [
                    (r"\b(it is|there is|there are)\s+(important|notable|worth noting|worth mentioning)\s+that\b", ""),
                    (r"\b(as you may know|as you might know|as you probably know)\b", ""),
                    (r"\b(according to|based on|per)\s+(research|studies|data|findings)\b", ""),
                    (r"\b(in general|generally speaking|typically|usually)\b", ""),
                    (r"\b(for example|for instance|such as|like)\b", "e.g."),
                    (r"\b(that is|in other words|namely|specifically)\b", "i.e."),
                ],
            },
            {
                "name": "question_preservation",
                "enabled": True,
                "patterns": [
                    (r"\b(how|what|when|where|why|who|which)\b", r"\1"),
                    (r"\b(can|could|would|will|should|might|may)\b", r"\1"),
                    (r"\b(explain|describe|tell|show|help)\b", r"\1"),
                    (r"\b(compare|contrast|analyze|evaluate)\b", r"\1"),
                    (r"\b(benefits|advantages|pros|drawbacks|disadvantages|cons)\b", r"\1"),
                    (r"\b(impact|effect|influence|role)\b", r"\1"),
                    (r"\b(future|potential|possibilities|developments)\b", r"\1"),
                    (r"\b(current|present|existing|modern)\b", r"\1"),
                    (r"\b(technology|innovation|advancement|development)\b", r"\1"),
                    (r"\b(artificial intelligence|AI|machine learning|ML)\b", r"\1"),
                    (r"\b(blockchain|NFT|cryptocurrency|digital)\b", r"\1"),
                    (r"\b(healthcare|medical|wellness|well-being)\b", r"\1"),
                    (r"\b(creativity|art|design|innovation)\b", r"\1"),
                    (r"\b(privacy|security|safety|protection)\b", r"\1"),
                    (r"\b(access|availability|distribution|reach)\b", r"\1"),
                    (r"\b(transformation|change|evolution|development)\b", r"\1"),
                    (r"\b(application|implementation|use|utilization)\b", r"\1"),
                    (r"\b(consideration|aspect|factor|element)\b", r"\1"),
                    (r"\b(implication|consequence|result|outcome)\b", r"\1"),
                    (r"\b(integration|incorporation|adoption|implementation)\b", r"\1"),
                ],
            },
        ]
        self.patterns = [
            # Remove redundant phrases
            {"pattern": r"in order to", "replacement": "to", "flags": "i"},
            {"pattern": r"that being said", "replacement": "", "flags": "i"},
            {"pattern": r"as a matter of fact", "replacement": "", "flags": "i"},
            {"pattern": r"in other words", "replacement": "", "flags": "i"},
            # Simplify common expressions
            {"pattern": r"would like to", "replacement": "want to", "flags": "i"},
            {"pattern": r"in terms of", "replacement": "about", "flags": "i"},
            {"pattern": r"with regard to", "replacement": "about", "flags": "i"},
            # Remove unnecessary modifiers
            {"pattern": r"\b(very|really|quite|extremely|highly)\s+", "replacement": "", "flags": "i"},
            {"pattern": r"\b(actually|basically|essentially|practically)\s+", "replacement": "", "flags": "i"},
            # Collapse repeated words
            {"pattern": r"\b(\w+)\s+\1\b", "replacement": r"\1", "flags": "i"},
            # Remove unnecessary punctuation
            {"pattern": r"([.,!?])\s*([.,!?])+", "replacement": r"\1", "flags": "g"},
            # Standardize spacing around punctuation
            {"pattern": r"\s+([.,!?])", "replacement": r"\1", "flags": "g"},
            {"pattern": r"([.,!?])\s+", "replacement": r"\1 ", "flags": "g"},
            # Remove unnecessary spaces
            {"pattern": r"\s+", "replacement": " ", "flags": "g"},
            {"pattern": r"^\s+|\s+$", "replacement": "", "flags": "g"},
        ]

    @staticmethod
    def _flags_from_string(flags: str) -> int:
        if not flags:
            return 0
        re_flags = 0
        if "i" in flags:
            re_flags |= re.IGNORECASE
        return re_flags

    def compress(self, text: str) -> str:
        """
        Compress text using rule-based transformations.

        Args:
            text: Input text to compress

        Returns:
            Compressed text
        """
        # 1. Apply grouped regex rules
        for group in self.rule_groups:
            if not group["enabled"]:
                continue
            for pattern, replacement in group["patterns"]:
                text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

        # 2. Replace verbose phrases
        for verbose, short in self.replacements.items():
            text = re.sub(rf'\b{verbose}\b', short, text, flags=re.IGNORECASE)

        # 3. Remove filler words
        words = text.split()
        words = [w for w in words if w.lower() not in self.filler_words]
        text = " ".join(words)

        # 4. Apply additional regex patterns
        for entry in self.patterns:
            flags = self._flags_from_string(entry.get("flags", ""))
            text = re.sub(entry["pattern"], entry["replacement"], text, flags=flags)

        # 5. Abbreviate common patterns
        text = re.sub(r'for example', 'e.g.', text, flags=re.IGNORECASE)
        text = re.sub(r'that is', 'i.e.', text, flags=re.IGNORECASE)

        # 6. Remove redundant whitespace
        text = re.sub(r'\s+', ' ', text).strip()

        return text
