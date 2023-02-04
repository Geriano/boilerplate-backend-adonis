FROM node
COPY . /app
WORKDIR /app
RUN rm -rf node_modules
RUN npm install --verbose