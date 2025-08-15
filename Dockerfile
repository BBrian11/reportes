# ------------ Build (Vite) ------------
    FROM node:20-alpine AS builder
    WORKDIR /app
    
    # Dependencias primero (cache)
    COPY package*.json ./
    RUN npm install
    
    # Código
    COPY . .
    
    # Build de producción
    RUN npm run build
    
    
    # ------------ Serve (Nginx + fallback) ------------
    FROM nginx:1.25-alpine
    
    # Escribimos la config de Nginx con fallback SPA
    # (En Dockerfile se escapa $ como $$)
    RUN printf '%s\n' \
      'server {' \
      '  listen 80;' \
      '  server_name _;' \
      '' \
      '  root /usr/share/nginx/html;' \
      '  index index.html;' \
      '' \
      '  location /assets/ {' \
      '    try_files $$uri =404;' \
      '    access_log off;' \
      '  }' \
      '' \
      '  location / {' \
      '    try_files $$uri /index.html;' \
      '  }' \
      '' \
      '  gzip on;' \
      '  gzip_types text/plain text/css application/javascript application/json image/svg+xml;' \
      '  gzip_min_length 1024;' \
      '}' > /etc/nginx/conf.d/default.conf
    
    # Archivos estáticos
    COPY --from=builder /app/dist /usr/share/nginx/html
    
    EXPOSE 80
    CMD ["nginx", "-g", "daemon off;"]
    