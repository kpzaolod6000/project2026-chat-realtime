---

Cómo levantarlo y probarlo

Los dos servicios juntos, desde la raíz:

pnpm dev # turbo corre @chat/web:3000 y @chat/server:3001 en paralelo

Turbo los levanta simultáneo porque dev tiene persistent: true y ninguno depende del otro.

curl -i http://localhost:3001/ # 404 JSON ← server vivo
open http://localhost:3000 # UI

Solo el server:

pnpm --filter @chat/server dev # tsx watch, hot reload

Como en producción:

pnpm build
pnpm --filter @chat/server start # node dist/index.js
HOST=0.0.0.0 PORT=4001 pnpm --filter @chat/server start # override por env

Editá src/app.ts, guardá → tsx reinicia solo. Ctrl-C corta ordenado (verás "msg":"shutting down").
