import os
import json
import numpy as np
from flask import Flask, request, jsonify, render_template
from tensorflow.keras.models import load_model
from PIL import Image, ImageChops, ImageEnhance

app = Flask(__name__)

# Load the trained model
MODEL_PATH = "models/trained_model.h5"
model = load_model(MODEL_PATH)

# Load accuracy JSON
ACCURACY_JSON_PATH = "models/accuracy.json"
if os.path.exists(ACCURACY_JSON_PATH):
    with open(ACCURACY_JSON_PATH, "r") as json_file:
        model_accuracy = json.load(json_file)
else:
    model_accuracy = {"accuracy": "Not Available"}

# Define directories & create if missing
UPLOAD_FOLDER = "static/uploads"
RESULT_FOLDER = "static/results"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULT_FOLDER, exist_ok=True)

# Define fixed image paths (overwrite previous files)
UPLOAD_IMAGE_PATH = os.path.join(UPLOAD_FOLDER, "image.jpg")
ELA_IMAGE_PATH = os.path.join(RESULT_FOLDER, "ela_image.jpg")

# Image Processing Parameters
IMG_SIZE = (128, 128)

# Function to apply Error Level Analysis (ELA)
def apply_ela(image_path, quality=90):
    original = Image.open(image_path).convert("RGB")
    
    # Save a temporary compressed JPEG
    temp_compressed_path = os.path.join(RESULT_FOLDER, "compressed.jpg")
    original.save(temp_compressed_path, "JPEG", quality=quality)
    
    # Open compressed version
    compressed = Image.open(temp_compressed_path)
    
    # Compute ELA difference
    diff = ImageChops.difference(original, compressed)
    extrema = diff.getextrema()
    max_diff = max([ex[1] for ex in extrema])
    
    if max_diff == 0:
        max_diff = 1
    
    scale = 255.0 / max_diff
    diff = ImageEnhance.Brightness(diff).enhance(scale)
    
    # Save ELA image (overwrite previous file)
    diff.save(ELA_IMAGE_PATH)

    return np.array(diff.resize(IMG_SIZE))

# Prediction Function
def predict_forgery(image_path):
    ela_img = apply_ela(image_path)
    ela_img = np.array(ela_img) / 255.0
    ela_img = np.expand_dims(ela_img, axis=0)  # Reshape for model input

    prediction = model.predict(ela_img)[0][0]  # Model prediction
    label = "Tempered" if prediction > 0.5 else "Authentic"
    
    return label, float(prediction)

# Flask Routes
@app.route("/")
def index():
    return render_template("index.html")

# @app.route('/about')
# def about():
#     return render_template('about.html')

@app.route("/predict", methods=["POST"])
def upload_and_predict():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    # Save the uploaded file (overwrite previous)
    file.save(UPLOAD_IMAGE_PATH)

    # Run prediction
    label, confidence = predict_forgery(UPLOAD_IMAGE_PATH)

    # Return JSON response
    response = {
        "result": label,
        "confidence": confidence,
        "model_accuracy": model_accuracy,
        "ela_image": ELA_IMAGE_PATH
    }
    return jsonify(response)

# Run Flask App
if __name__ == "__main__":
    app.run(debug=False)
