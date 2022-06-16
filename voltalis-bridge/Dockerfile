ARG BUILD_FROM
FROM $BUILD_FROM

ENV LANG C.UTF-8
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN apk add --no-cache \
    nodejs \
    yarn \
    git 

COPY package.json /
COPY yarn.lock /
COPY tsconfig.json /
COPY src/ /src/

RUN cd / && yarn install && yarn build

COPY run.sh /
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
