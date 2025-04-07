FROM node:23-alpine AS base

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
RUN apk add vim

WORKDIR /app

COPY . ./

RUN npm i -g pnpm
# Download zk-app cli for key management
RUN npm i -g zk-app

RUN pnpm install
RUN pnpm build

RUN mkdir /app/apps/backend-contract/keys/

WORKDIR /app/apps/backend
CMD [ "pnpm" , "start" ]


EXPOSE 16001
