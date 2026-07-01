FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl

# Schéma Prisma requis avant npm install (script postinstall → prisma generate)
COPY package.json package-lock.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci --ignore-scripts 2>/dev/null || npm install --ignore-scripts

COPY . .
ENV DATABASE_URL="file:/data/prod.db"
RUN npx prisma generate && npm run build

RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 1899
ENV PORT=1899
ENV HOSTNAME="0.0.0.0"
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "start"]
