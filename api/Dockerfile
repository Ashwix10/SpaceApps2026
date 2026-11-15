FROM node:22-slim AS frontend
WORKDIR /app
COPY web/package.json web/package-lock.json ./web/
RUN npm --prefix web ci
COPY web ./web
COPY data ./data
RUN npm --prefix web run build

FROM python:3.11-slim
WORKDIR /app
COPY model model
COPY explain explain
COPY api api
COPY data data
COPY --from=frontend /app/web/dist web/dist
RUN pip install --no-cache-dir -e model -e explain -r api/requirements.lock
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "exec python -m api.serve --host 0.0.0.0 --port ${PORT}"]
