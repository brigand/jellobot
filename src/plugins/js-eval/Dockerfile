FROM node:slim
RUN npm i --prefix /run date-fns airbnb-js-shims full-icu acorn nearley
# acorn nearley are needed by engine262
RUN curl https://engine262.js.org/engine262.js > /run/node_modules/engine262.js

FROM debian:stretch-slim
RUN useradd node && mkdir -p /home/node && chown -R node:node /home/node
WORKDIR /home/node
COPY --from=0 /run /run
COPY --from=0 /usr/local/bin/node /usr/local/bin/node
COPY --chown=node run.js /run/
USER node
ENV NODE_ICU_DATA=/run/node_modules/full-icu
CMD ["node", "--no-warnings", "/run/run.js"]
