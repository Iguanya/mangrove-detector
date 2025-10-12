from flask import Flask, render_template, request, jsonify
from inference_sdk import InferenceHTTPClient
import os
from datetime import datetime

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'

# Roboflow inference client
client = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key="NTfoWVi9gAwdv1EHRxUM"
)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/detect', methods=['POST'])
def detect():
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    # Save uploaded image
    filename = datetime.now().strftime("%Y%m%d%H%M%S_") + file.filename
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    # Run Roboflow workflow
    result = client.run_workflow(
        workspace_name="mangrove-7pypu",
        workflow_id="detect-count-and-visualize-2",
        images={"image": filepath},
        use_cache=True
    )

    # If the request came from the camera (AJAX), return JSON
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify(result)

    return render_template('result.html', image_path=filepath, result=result)

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(host='0.0.0.0', port=5000, debug=True)
