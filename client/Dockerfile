# Build step
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Supply backend API URL via build arg or environment
# Provide your production API URL here or at build time
ENV VITE_API_URL=/api
RUN npm run build

# Serve step using Nginx
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder
COPY --from=build /app/dist /usr/share/nginx/html

# Replace default config with our custom one using port 3000
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Port 3000 used inside container to avoid host conflict assumptions
EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
