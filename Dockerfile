FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json ./
RUN npm install
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
