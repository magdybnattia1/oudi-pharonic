# Oudi PHARONIC API (Cloudflare Worker)

This API stores the public product catalog in Cloudflare KV. The public website can read products; only an authenticated admin can add, edit, or delete them.

## One-time Cloudflare setup
1. Create a KV namespace named `OUDI_PRODUCTS`.
2. Copy its namespace ID into `wrangler.toml`, replacing `REPLACE_WITH_KV_NAMESPACE_ID`.
3. Deploy this Worker from the `worker` directory (Worker name: `oudi-pharonic-api`).
4. In Worker > Settings > Variables and Secrets, add these as **Secrets**:
   - `ADMIN_PASSWORD`: choose your own strong private password. Never send it in chat or commit it to GitHub.
   - `SESSION_SECRET`: a long random secret (at least 32 characters).
5. After deploy, copy the Worker URL. The website frontend must use that exact API URL.

## API
- `GET /api/products` — public catalog.
- `POST /api/login` with JSON `{"password":"..."}` — returns a signed 8-hour bearer token.
- `POST /api/products` — add product; requires `Authorization: Bearer <token>`.
- `PUT /api/products/:id` — edit product; requires token.
- `DELETE /api/products/:id` — delete product; requires token.

CORS is restricted to the current GitHub Pages origin: `https://magdybnattia1.github.io`.
The API is not live until you create the KV namespace, set both secrets, and deploy it. Do not claim the admin panel is protected until the Worker is deployed and tested.
