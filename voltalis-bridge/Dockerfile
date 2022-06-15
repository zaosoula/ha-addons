ARG BUILD_FROM
FROM $BUILD_FROM

ENV LANG C.UTF-8
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN apk add --no-cache \
    nodejs \
    npm \
    git

RUN npm install -g yarn

COPY package.json /
COPY yarn.lock /
COPY index.js /
COPY voltalis.js /
COPY homeassistant.js /

RUN cd / && yarn install 

COPY run.sh /
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
