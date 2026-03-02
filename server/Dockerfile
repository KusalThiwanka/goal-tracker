FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --production

COPY . .

# Avoid conflicting with host ports (like 8000/8081/5678)
ENV PORT=5000

EXPOSE 5000

CMD ["npm", "start"]
