# PawHome Backend

## 开发启动

1) 准备 `backend/.env`

必填：
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

可选：
- `API_PREFIX`（默认 `/api/v1`）

2) 安装依赖并运行

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows 用 .venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

默认服务地址：`http://127.0.0.1:5000`，健康检查：`GET /api/v1/health`

## 测试

```bash
cd backend
pip install -r requirements.txt -r requirements-dev.txt
pytest -q
```

