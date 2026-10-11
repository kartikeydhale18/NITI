# Multi-stage Dockerfile for NITI (FastAPI + React)
# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend & Production Runtime
FROM python:3.10-slim AS runner
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend, datasets, and built frontend
COPY backend/ ./backend/
COPY dataset/ ./dataset/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose FastAPI & Frontend port
EXPOSE 8000

ENV PYTHONUNBUFFERED=1

WORKDIR /app/backend
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
