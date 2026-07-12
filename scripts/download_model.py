import os, urllib.request

model_dir = os.path.join(os.getcwd(), ".u2net")
os.makedirs(model_dir, exist_ok=True)
path = os.path.join(model_dir, "u2net.onnx")
if os.path.exists(path):
    print("Model already cached")
else:
    print("Downloading rembg model (170MB)...")
    urllib.request.urlretrieve(
        "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx",
        path,
    )
    print("Model downloaded")
