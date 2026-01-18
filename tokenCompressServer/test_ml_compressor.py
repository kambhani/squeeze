
from ml_compressor import MLCompressor

def test_ml_compression():
    compressor = MLCompressor()
    text = "This is a long sentence to test the machine learning based compression. We want to see if it can effectively shorten the text while retaining the meaning."
    compressed_text = compressor.compress(text)
    print(f"Original text: {text}")
    print(f"Compressed text: {compressed_text}")

if __name__ == "__main__":
    test_ml_compression()
