# ------------ Build (Vite) ------------
    FROM node:20-alpine AS builder
    WORKDIR /app
    COPY package*.json ./
    RUN npm install
    COPY . .
    RUN npm run build
    
    # ------------ Serve (Nginx) ------------
    FROM nginx:1.25-alpine
    
    # Copiamos la config del repo
    COPY nginx.conf /etc/nginx/conf.d/default.conf
    
    # 🔧 Sanear por si vino con BOM/CRLF/espacios raros
    RUN apk add --no-cache dos2unix \
     && dos2unix /etc/nginx/conf.d/default.conf \
     && sed -i '1s/^\xEF\xBB\xBF//' /etc/nginx/conf.d/default.conf \
     && sed -i 's/\xC2\xA0/ /g' /etc/nginx/conf.d/default.conf
    
    # App estática
    COPY --from=builder /app/dist /usr/share/nginx/html
    
    EXPOSE 80
    CMD ["nginx", "-g", "daemon off;"]
    