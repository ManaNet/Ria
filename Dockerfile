FROM node:16
WORKDIR /usr/src/app

# Copy all the package.json first.
COPY package*.json ./

# Build the production image.
RUN npm install

COPY . .

RUN npx tsc -p .

CMD [ "node", "./src/index.js"]