FROM oven/bun:debian

WORKDIR /app

RUN apt-get update \
    && apt-get upgrade -y \
    && DEBIAN_FRONTEND="noninteractive" TZ="Europe/Berlin" apt-get install -y tzdata git

COPY ./deploy /app/deploy
COPY ./monitors /app/monitors
COPY ./utils /app/utils
RUN mkdir /app/config

COPY ./index.js /app/index.js
COPY ./package-lock.json /app/package-lock.json
COPY ./package.json /app/package.json

COPY ./entrypoint.sh /app/entrypoint.sh

RUN groupadd -g 1099 monitor \
    && useradd --shell /bin/bash --uid 1099 --gid 1099 -m monitor
RUN chown -R monitor:monitor /app

RUN chmod 744 /app/entrypoint.sh
USER monitor

ENTRYPOINT ["/app/entrypoint.sh"]
