FROM node:22-alpine AS web
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
RUN useradd --create-home --uid 10001 gale
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend ./backend
COPY --from=web /src/dist ./frontend/dist
ENV GALE_STATIC=/app/frontend/dist
USER gale
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health')"
CMD ["uvicorn", "gale.main:app", "--app-dir", "backend", "--host", "0.0.0.0", "--port", "8000"]
