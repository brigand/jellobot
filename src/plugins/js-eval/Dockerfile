FROM debian:10-slim

RUN apt-get update && apt-get install -y xz-utils ca-certificates curl --no-install-recommends
# Note: this has a tendency to over-cache, and can be bypassed with an edit like `RUN x=1 && node_version=…`
RUN node_version=$(curl -sSL https://nodejs.org/download/release/ | awk '/>v/{ split($2, a, "[<>]"); sub("/","",a[2]); print a[2] }' | sort -V | tail -n1) \
  && curl -fsSLO --compressed "https://nodejs.org/download/release/$node_version/node-$node_version-linux-x64.tar.xz" \
  && tar -xJf "node-$node_version-linux-x64.tar.xz" -C /usr/local --strip-components=1 --no-same-owner
RUN node --version

# install shims, and acorn+nearley needed by engine262
RUN npm i --prefix /run airbnb-js-shims@latest acorn@latest nearley@latest
RUN curl https://engine262.js.org/engine262/engine262.js -o /run/node_modules/engine262.js

FROM debian:10-slim

RUN useradd node && mkdir -p /home/node && chown -R node:node /home/node
WORKDIR /home/node
COPY --from=0 /run /run
COPY --from=0 /usr/local/bin/node /usr/local/bin/node
COPY --chown=node run.js /run/
USER node
ENV NODE_ICU_DATA=/run/node_modules/full-icu
CMD ["node", "--no-warnings", "/run/run.js"]
