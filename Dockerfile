FROM node:23-alpine AS base

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY . ./

RUN npm i -g pnpm

RUN pnpm install
RUN pnpm build

WORKDIR /app/apps/backend
CMD [ "pnpm" , "start" ]


EXPOSE 16001
