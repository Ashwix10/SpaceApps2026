FROM python:3.11-slim
WORKDIR /app
COPY model model
COPY explain explain
COPY api api
COPY data data
RUN pip install --no-cache-dir -e model -e explain -r api/requirements.txt
ENV PORT=8000
CMD ["sh", "-c", "exec uvicorn api.main:app --host 0.0.0.0 --port ${PORT}"]
