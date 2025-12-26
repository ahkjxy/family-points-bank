# Multi-stage build for Vite + React static site
FROM node:20-alpine AS builder
WORKDIR /app
ARG NPM_REGISTRY=https://registry.npmmirror.com
RUN npm config set registry ${NPM_REGISTRY}
COPY package.json yarn.lock* ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:stable-alpine AS runner
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/dist .

# SPA history fallback and basic caching
RUN rm /etc/nginx/conf.d/default.conf
RUN printf 'server {\n  listen 80;\n  listen [::]:80;\n  server_name _;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|otf)$ {\n    add_header Cache-Control "public, max-age=31536000, immutable";\n    try_files $uri /index.html;\n  }\n}'> /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost || exit 1

CMD ["nginx", "-g", "daemon off;"]
