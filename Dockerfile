FROM node:latest as backend
COPY . /backend
WORKDIR /backend
ENV TZ=Asia/Jakarta
ENV DB_CONNECTION=pg
ENV PG_HOST=host.docker.internal
ENV PG_USER=root
ENV PG_PASSWORD=root
ENV PG_DB_NAME=boilerplate
CMD ["sh", "-c", "node", "ace", "migration:fresh", "--seed", "--force", "&&", "node", "ace", "serve"]
EXPOSE 3333