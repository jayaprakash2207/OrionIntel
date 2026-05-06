@echo off
echo =========================================
echo   OrionIntel - Starting both servers
echo =========================================
echo.
echo Starting Python backend on port 8000...
start "OrionIntel Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn main:app --reload --port 8000"
timeout /t 3 /nobreak >nul
echo Starting Next.js frontend on port 3000...
start "OrionIntel Frontend" cmd /k "cd frontend && npm run dev"
echo.
echo =========================================
echo   Both servers starting in new windows!
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:8000
echo   API Docs:  http://localhost:8000/docs
echo =========================================
pause
