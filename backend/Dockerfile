# Use the official Manim Community image which has LaTeX, FFmpeg, and Cairo pre-installed.
FROM manimcommunity/manim:stable

# Switch to root to install python libraries and write to the filesystem
USER root

# Set the working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the API port
EXPOSE 8000

# Default command (FastAPI Web Server). 
# Note: Render overrides this command for the Celery Worker service.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
