import os
from flask import Flask, send_from_directory

app = Flask(__name__)

# Define the directory for pages
PAGES_DIR = '/pages'

@app.route('/')
def index():
    # Serve index.html as the default page
    return send_from_directory(PAGES_DIR, 'index.html')

@app.route('/<path:filename>')
def serve_page(filename):
    return send_from_directory(PAGES_DIR, filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
