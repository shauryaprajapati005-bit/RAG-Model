import os
from typing import List, Optional
from google import genai
from backend.app.config import settings

class EmbeddingService:
    _client: Optional[genai.Client] = None
    MODEL_NAME = "gemini-embedding-001"
    DIMENSIONS = 768

    @classmethod
    def get_client(cls) -> genai.Client:
        if cls._client is None:
            api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
            if not api_key:
                raise ValueError("GEMINI_API_KEY is not configured in environment or settings.")
            cls._client = genai.Client(api_key=api_key)
        return cls._client

    @classmethod
    def get_embedding(cls, text: str) -> List[float]:
        """
        Generate a 768-dimensional embedding vector for a single query or text.
        """
        client = cls.get_client()
        clean_text = text.strip()
        if not clean_text:
            return []

        try:
            response = client.models.embed_content(
                model=cls.MODEL_NAME,
                contents=clean_text,
                config={"output_dimensionality": cls.DIMENSIONS}
            )
            return list(response.embeddings[0].values)
        except Exception as e:
            print(f"[EmbeddingService Error] Failed to generate embedding: {e}")
            raise e

    @classmethod
    def get_embeddings_batch(cls, texts: List[str], batch_size: int = 50) -> List[List[float]]:
        """
        Generate 768-dimensional embeddings for a list of text chunks in batches.
        Submits up to batch_size items per API request for maximum speed and efficiency.
        """
        if not texts:
            return []

        client = cls.get_client()
        all_embeddings: List[List[float]] = []

        for i in range(0, len(texts), batch_size):
            chunk_slice = texts[i : i + batch_size]
            clean_slice = [t.strip() if t.strip() else " " for t in chunk_slice]
            
            try:
                res = client.models.embed_content(
                    model=cls.MODEL_NAME,
                    contents=clean_slice,
                    config={"output_dimensionality": cls.DIMENSIONS}
                )
                batch_vectors = [list(e.values) for e in res.embeddings]
                all_embeddings.extend(batch_vectors)
            except Exception as e:
                print(f"[EmbeddingService Batch Error on slice {i}:{i+batch_size}]: {e}")
                # Fallback item-by-item for this slice if batch request fails
                for t in clean_slice:
                    try:
                        single_res = client.models.embed_content(
                            model=cls.MODEL_NAME,
                            contents=t,
                            config={"output_dimensionality": cls.DIMENSIONS}
                        )
                        all_embeddings.append(list(single_res.embeddings[0].values))
                    except Exception as single_err:
                        print(f"[EmbeddingService Single Fallback Error]: {single_err}")
                        all_embeddings.append([])

        return all_embeddings
