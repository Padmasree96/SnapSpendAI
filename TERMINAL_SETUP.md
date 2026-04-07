# Terminal Setup

Use the PowerShell helper below to launch the backend and frontend with the ports this project expects:

- Backend: `http://127.0.0.1:8000`
- Frontend: `http://127.0.0.1:5173`

## One command

From the project root (`FinAPP/FinAPP`), run:

```powershell
.\terminal-setup.ps1
```

That script opens:

1. A backend terminal running `uvicorn main:app --host 127.0.0.1 --port 8000 --reload`
2. A frontend terminal running `npm run dev -- --host 127.0.0.1 --port 5173`

## Notes

- The frontend proxy is configured to send `/api` traffic to `127.0.0.1:8000`.
- If port `8000` is already in use, the script leaves the existing backend alone.
- If port `5173` is already in use, the script leaves the existing frontend alone.
