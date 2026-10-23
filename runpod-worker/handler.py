
import runpod
from sentence_transformers import SentenceTransformer

# Load the model once when the worker starts.
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
model = SentenceTransformer(MODEL_NAME)


def handler(event):
    job_input = event.get("input", {})

    # Accept either one text or a list of texts.
    texts = job_input.get("texts")

    if texts is None:
        text = job_input.get("text")
        if text is None:
            return {
                "error": "Please provide 'text' or 'texts'."
            }
        texts = [text]

    if not isinstance(texts, list) or not texts:
        return {
            "error": "'texts' must be a non-empty list."
        }

    if not all(isinstance(text, str) and text.strip() for text in texts):
        return {
            "error": "Every text must be a non-empty string."
        }

    if len(texts) > 64:
        return {
            "error": "Please submit at most 64 texts per request."
        }

    embeddings = model.encode(
        texts,
        normalize_embeddings=True,
        convert_to_numpy=True
    )

    return {
        "model": MODEL_NAME,
        "dimensions": int(embeddings.shape[1]),
        "embeddings": embeddings.tolist()
    }


if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})

