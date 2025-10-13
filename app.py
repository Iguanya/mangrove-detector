from flask import Flask, render_template, request, jsonify
from inference_sdk import InferenceHTTPClient
from dotenv import load_dotenv
import os
from datetime import datetime
from PIL import Image
import io
import pillow_heif  # For HEIC/HEIF support

load_dotenv()  # Load variables from .env

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5 MB max upload

# Retrieve the API key securely
api_key = os.getenv("ROBOFLOW_API_KEY")

# Initialize Roboflow inference client
client = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key=api_key
)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "heic", "heif"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/detect', methods=['GET', 'POST'])
def detect():
    if request.method == 'POST':
        if 'image' not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        file = request.files['image']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        if not allowed_file(file.filename):
            return jsonify({"error": "Unsupported file type"}), 400

        # Ensure upload folder exists
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

        # Convert HEIC/HEIF to JPEG
        ext = file.filename.rsplit(".", 1)[1].lower()
        if ext in ("heic", "heif"):
            heif_file = pillow_heif.read_heif(file.read())
            image = Image.frombytes(heif_file.mode, heif_file.size, heif_file.data)
        else:
            image = Image.open(file.stream)

        # Save as JPEG
        filename = datetime.now().strftime("%Y%m%d%H%M%S_") + "uploaded.jpg"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        image = image.convert("RGB")  # Ensure RGB mode for JPEG
        image.save(filepath, format="JPEG", quality=95)

        # Send to Roboflow
        result = client.run_workflow(
            workspace_name="mangrove-7pypu",
            workflow_id="detect-count-and-visualize-2",
            images={"image": filepath},
            use_cache=True
        )

        return render_template('result.html', image_path=filepath, result=result)

    # GET → render detect page
    return render_template('detect.html')

@app.route("/log", methods=["POST"])
def log_message():
    data = request.json
    level = data.get("level", "INFO")
    message = data.get("message", "")
    print(f"[{level}] {message}")  # this prints to your terminal
    return jsonify({"status": "ok"})


if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(host='0.0.0.0', port=5050, debug=True)
