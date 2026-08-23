FROM node:22-alpine AS dependencies
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci --omit=dev
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate
RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "src/app.js"]
