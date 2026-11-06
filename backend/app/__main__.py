import uvicorn
uvicorn.run("app.main:app", host="127.0.0.1", port=3001, reload=True)
