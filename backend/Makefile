dev:
	uvicorn main:app --reload --port 8000

start:
	uvicorn main:app --host 0.0.0.0 --port 8000

install:
	pip install -r requirements.txt

freeze:
	pip freeze > requirements.txt

test:
	pytest tests/ -v

lint:
	ruff check .

format:
	ruff format .

health:
	curl http://localhost:8000/health/

ready:
	curl http://localhost:8000/health/ready
