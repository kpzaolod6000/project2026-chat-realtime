# chat-app

Plataforma de videoconferencia en tiempo real sobre [LiveKit](https://livekit.io)
autoalojado. Monorepo TypeScript: Next.js para la interfaz, Fastify para la API,
PostgreSQL para persistencia y el SFU de LiveKit para el enrutado WebRTC.

Estado: **v0.1 en construcción**. La escalera de versiones vive en
`openspec/changes/project-foundation/tasks.md`.

## Estructura

```
apps/web         Next.js App Router, puerto 3000 — interfaz
apps/server      Fastify, puerto 3001 — API JSON, sin React
packages/shared  Tipos, esquemas zod y constantes compartidos por ambos
packages/database Prisma: esquema, migraciones y repositorios
packages/config  Presets de ESLint, TypeScript y Prettier
```

`apps/web` y `apps/server` son dos desplegables independientes dentro de un
mismo repositorio. Esa separación es deliberada y tiene un coste concreto —
cookies entre orígenes distintos, CORS explícito y CSRF obligatorio. El
razonamiento completo está en `openspec/changes/project-foundation/design.md`.

## Requisitos

| Herramienta      | Versión    | Para qué                                     |
| ---------------- | ---------- | -------------------------------------------- |
| Node.js          | >= 20      | Ejecuta ambas apps                           |
| pnpm             | 10.34.5    | Gestor de paquetes del workspace             |
| mkcert           | cualquiera | Certificados TLS locales de confianza        |
| Docker + Compose | cualquiera | LiveKit, Redis, Coturn, PostgreSQL (grupo 2) |

## Puesta en marcha

```bash
pnpm install

cp .env.example .env      # editar si hace falta
pnpm certs                # TLS local, una sola vez por máquina

pnpm dev                  # web en :3000, server en :3001
```

### Por qué hace falta HTTPS en local

La sesión viaja en una cookie `SameSite=None; Secure`, porque la interfaz y la
API están en orígenes distintos. Los navegadores descartan las cookies `Secure`
sobre HTTP, así que sin TLS el login parece funcionar y la sesión nunca llega a
la API. No es una recomendación de seguridad: es un requisito para que la
aplicación arranque.

`pnpm certs` usa [mkcert](https://github.com/FiloSottile/mkcert), que instala
una autoridad certificadora local en el almacén de confianza del sistema. Los
certificados salen a `certs/`, que está en `.gitignore` — son específicos de
cada máquina y contienen una clave privada.

Instalación de mkcert:

```bash
# Debian / Ubuntu
sudo apt install libnss3-tools && \
  curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64" && \
  chmod +x mkcert-v*-linux-amd64 && sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert

# macOS
brew install mkcert nss
```

## Comandos

| Comando             | Qué hace                                               |
| ------------------- | ------------------------------------------------------ |
| `pnpm dev`          | Levanta ambas apps en paralelo con recarga en caliente |
| `pnpm build`        | Compila todo el grafo de tareas                        |
| `pnpm lint`         | ESLint en todos los paquetes                           |
| `pnpm typecheck`    | `tsc --noEmit` en todos los paquetes                   |
| `pnpm test`         | Suites unitarias                                       |
| `pnpm format`       | Prettier sobre el repositorio                          |
| `pnpm format:check` | Falla si algo no está formateado — lo que corre CI     |
| `pnpm certs`        | Genera los certificados TLS locales                    |

Para un solo paquete: `pnpm --filter @chat/server dev`.

Si necesitás la interfaz sin TLS —por ejemplo para depurar algo ajeno a la
sesión— hay un escape: `pnpm --filter @chat/web dev:http`. El login no
funcionará; es intencional.

## Variables de entorno

Todas viven en un único `.env` en la raíz, documentadas una a una en
`.env.example`. Ambas aplicaciones lo leen desde ahí; no hay `.env` por
paquete, porque una variable duplicada acaba divergiendo.

La validación ocurre al arrancar, contra un esquema zod. Si falta una variable
o tiene un formato inválido, el proceso no arranca y dice cuál — en lugar de
fallar tres capas más abajo con un `undefined`.

Las variables con prefijo `NEXT_PUBLIC_` se incrustan en el bundle del
navegador. Todo lo que esté ahí es público.

## Documentación

La documentación para personas usuarias y operadoras vive en `docs/`, en
español. El código, sus comentarios y los artefactos de OpenSpec están en
inglés.

Las especificaciones y el plan de trabajo están bajo `openspec/`.
