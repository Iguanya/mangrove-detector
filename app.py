from flask import Flask, render_template, request, jsonify
from inference_sdk import InferenceHTTPClient
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()  # Load variables from .env

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'

# Retrieve the API key securely
api_key = os.getenv("ROBOFLOW_API_KEY")

# Initialize Roboflow inference client
client = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key=api_key
)

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

        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        filename = datetime.now().strftime("%Y%m%d%H%M%S_") + file.filename
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        result = client.run_workflow(
            workspace_name="mangrove-7pypu",
            workflow_id="detect-count-and-visualize-2",
            images={"image": filepath},
            use_cache=True
        )

        return render_template('result.html', image_path=filepath, result=result)

    # GET → render detect page
    return render_template('detect.html')

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(host='0.0.0.0', port=5050, debug=True)
