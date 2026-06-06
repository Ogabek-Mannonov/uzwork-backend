FROM node:20-alpine

# Ishchi papkani yaratish
WORKDIR /app

# npm paketlarni ko'chirish va o'rnatish
COPY package*.json ./
RUN npm install

# Barcha kodlarni ko'chirish
COPY . .

# Port
EXPOSE 3000

# Ishga tushirish
CMD ["npm", "start"]
