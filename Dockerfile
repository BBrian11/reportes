# ------------ Build (Vite) ------------
    FROM node:20-alpine AS builder
    WORKDIR /app
    
    # Dependencias
    COPY package*.json ./
    RUN npm install
    # Si usás package-lock.json y querés builds reproducibles: RUN npm ci
    
    # Código
    COPY . .
    
    # Build
    RUN npm run build
    
    # ------------ Serve (Nginx) ------------
    FROM nginx:1.25-alpine
    
    # Copiamos la config (con LF) y la app
    COPY nginx.conf /etc/nginx/conf.d/default.conf
    COPY --from=builder /app/dist /usr/share/nginx/html
    
    # (Paranoia anti-CRLF: elimina \r en caso de que el repo viniera con CRLF)
    # RUN sed -i 's/\r$//' /etc/nginx/conf.d/default.conf
    
    EXPOSE 80
    CMD ["nginx", "-g", "daemon off;"]
    