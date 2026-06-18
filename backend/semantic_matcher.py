import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


class SemanticMatcher:
    """
    Wraps a sentence-transformers model for semantic similarity.

    Uses `all-MiniLM-L6-v2` by default to encode text into 384-dim vectors
    and measures relevance via cosine similarity.  Gracefully degrades to
    a no-op (zero vectors) when the model is unavailable, allowing the
    scoring engine to fall back to keyword matching.
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model = None
        self.model_name = model_name
        self.loaded = False

    def load_model(self):
        """Download (if needed) and load the sentence-transformers model."""
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(self.model_name)
            self.loaded = True
        except Exception as e:
            print(f"Warning: Could not load sentence-transformers model: {e}")
            print("Falling back to keyword-based matching.")
            self.loaded = False

    def encode(self, text: str) -> np.ndarray:
        """Return the embedding vector for a single text string."""
        if self.loaded and self.model is not None:
            return self.model.encode(text)
        return np.zeros(384)

    def encode_batch(self, texts: list[str]) -> np.ndarray:
        """Return embedding vectors for a list of texts."""
        if self.loaded and self.model is not None:
            return self.model.encode(texts)
        return np.zeros((len(texts), 384))

    def compute_similarity(self, text1: str, text2: str) -> float:
        """Cosine similarity between two text strings.  Returns 0..1."""
        vec1 = self.encode(text1).reshape(1, -1)
        vec2 = self.encode(text2).reshape(1, -1)
        return float(cosine_similarity(vec1, vec2)[0][0])

    def compute_similarity_matrix(self, texts_a: list[str], texts_b: list[str]) -> np.ndarray:
        """Pairwise cosine similarity between all strings in two lists."""
        vecs_a = self.encode_batch(texts_a)
        vecs_b = self.encode_batch(texts_b)
        return cosine_similarity(vecs_a, vecs_b)

    def match_skills(self, jd_skills: list[str], candidate_skills: list[str]) -> list[tuple[str, float]]:
        """
        For each candidate skill, find the JD skill it matches best and
        return a ranked list of (skill, score) pairs.
        """
        matches = []
        for c_skill in candidate_skills:
            best_score = 0.0
            for jd_skill in jd_skills:
                score = self.compute_similarity(c_skill, jd_skill)
                if score > best_score:
                    best_score = score
            matches.append((c_skill, best_score))
        matches.sort(key=lambda x: x[1], reverse=True)
        return matches
