import uvicorn
from app.config import settings

if __name__ == "__main__":
    print(f"Starting server on http://localhost:{settings.PORT}")
    print(f"Interactive documentation available at http://localhost:{settings.PORT}/docs")
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
