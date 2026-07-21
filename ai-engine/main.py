from fastapi import FastAPI

app = FastAPI(
    title="AI Engine Service"
)


@app.get("/")
def health():
    return {
        "status": "AI Engine running"
    }