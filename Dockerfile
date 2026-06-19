FROM node:18 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.9
WORKDIR /app

# Set python path environment variable so dependencies import properly
ENV PYTHONPATH=/app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend
COPY --from=frontend-build /app/frontend/build ./frontend/dist

EXPOSE 7860

# We run from /app context using the module reference
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
