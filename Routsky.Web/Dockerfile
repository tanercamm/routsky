FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_APP_ENV
ENV VITE_APP_ENV=${VITE_APP_ENV}

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .
RUN rm -rf dist && npm run build

FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
