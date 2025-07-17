ARG BUILD_FROM=ghcr.io/hassio-addons/base:18.0.3
FROM $BUILD_FROM

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN apk add --no-cache \
    nodejs \
    npm \
    git

RUN npm install -g corepack
RUN corepack enable

COPY package.json /
COPY yarn.lock /
COPY tsconfig.json /
COPY src/ /src/

RUN cd / && yarn install && yarn build

COPY run.sh /
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
