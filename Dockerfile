FROM node:23-alpine AS base

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
RUN apk add vim bash jq

WORKDIR /app
COPY . ./
RUN cp .env.sample .env
RUN mkdir /app/apps/backend-contract/keys/


RUN npm i -g pnpm
# Download zk-app cli for key management
RUN npm i -g zkapp-cli

RUN pnpm install
RUN pnpm build


WORKDIR /app/apps/backend
CMD [ "pnpm" , "start" ]


EXPOSE 16001
