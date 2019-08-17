FROM node:slim
RUN npm i --prefix /run airbnb-js-shims full-icu acorn nearley
# acorn nearley are needed by engine262
RUN mkdir /run/vendor && curl https://engine262.js.org/engine262.js > /run/vendor/engine262.js
# test that the file is valid
RUN node -p 'assert(require("./run/vendor/engine262.js").Realm)'

FROM debian:stretch-slim
RUN useradd node && mkdir -p /home/node && chown -R node:node /home/node
WORKDIR /home/node
COPY --from=0 /run /run
COPY --from=0 /usr/local/bin/node /usr/local/bin/node
COPY --chown=node run.js /run/
USER node
ENV NODE_ICU_DATA=/run/node_modules/full-icu
CMD ["node", "--no-warnings", "/run/run.js"]
