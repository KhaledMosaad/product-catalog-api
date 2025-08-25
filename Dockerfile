FROM node:22-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]