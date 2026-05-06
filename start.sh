#!/bin/bash
echo "========================================="
echo "  OrionIntel — Starting both servers"
echo "========================================="
echo ""

# Start Python backend
echo "Starting Python backend on port 8000..."
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000 --host 0.0.0.0 &
PYTHON_PID=$!
echo "Python PID: $PYTHON_PID"
cd ..

# Wait for backend to be ready
sleep 2

# Start Next.js frontend
echo "Starting Next.js frontend on port 3000..."
cd frontend
npm run dev &
NEXT_PID=$!
echo "Next.js PID: $NEXT_PID"
cd ..

echo ""
echo "========================================="
echo "  Both servers running!"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:8000"
echo "  API Docs:  http://localhost:8000/docs"
echo "  Health:    http://localhost:8000/api/health"
echo "========================================="
echo "Press Ctrl+C to stop both servers"

trap "kill $PYTHON_PID $NEXT_PID" EXIT
wait
