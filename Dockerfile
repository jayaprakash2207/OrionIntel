FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements-cloud.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

ENV HOST=0.0.0.0
ENV PORT=8000

EXPOSE $PORT

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
