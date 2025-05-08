# Use an official Python runtime as a parent image
FROM --platform=linux/amd64 python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container at /app
COPY docker-data/ ./

# Install any needed packages specified in requirements.txt
# Ensure that any system dependencies for Python packages are installed before this step if needed
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy the rest of the application code into the container at /app
COPY . .

# Expose the port the app runs on 
EXPOSE 8000

# Define environment variable (example)
# ENV NAME World

# Run main.py when the container launches.
# main.py will handle initial setup (if needed) and then start Uvicorn.
CMD ["python", "setup.py"]
