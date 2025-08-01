# Imagen base
FROM node:20-alpine AS builder

# Directorio de trabajo
WORKDIR /app

# Copiar dependencias primero para cache
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar todo el proyecto
COPY . .

# Compilar la app (Vite build)
RUN npm run build

# -----------------------------
# Etapa final (servidor NGINX)
# -----------------------------
FROM nginx:alpine

# Copiar la build al servidor NGINX
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer puerto 80
EXPOSE 80

# Iniciar NGINX
CMD ["nginx", "-g", "daemon off;"]
