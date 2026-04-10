FROM node:18-bullseye

# Sistemi yenilə və əsl Linux FFmpeg-i yüklə
RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /app

# Paketləri yüklə
COPY package*.json ./
RUN npm install

# Bütün kodları kopyala
COPY . .

EXPOSE 4000
CMD ["node", "index.js"]
