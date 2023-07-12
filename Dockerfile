FROM node:20.2 as backend
COPY . /backend
WORKDIR /backend
EXPOSE 3333
RUN rm -rf node_modules
RUN npm install --prefer-offline