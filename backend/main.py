from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import connect_db, close_db
from routes.auth_routes import router as auth_router
from routes.user_routes import router as user_router
from routes.engine_routes import router as engine_router
from routes.library_routes import router as library_router
from routes.notification_routes import router as notification_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="Technological Terroir API",
    description="Backend for the Terroir agritech platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow requests from the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(engine_router)
app.include_router(library_router)
app.include_router(notification_router)


@app.get("/")
async def root():
    return {"status": "Terroir API is running 🌱"}
