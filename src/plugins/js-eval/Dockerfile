FROM node:slim
RUN npm i --prefix /run date-fns airbnb-js-shims

FROM debian:stretch-slim
RUN useradd node && mkdir -p /home/node && chown -R node:node /home/node
WORKDIR /home/node
COPY --from=0 /run /run
COPY --from=0 /usr/local/bin/node /usr/local/bin/node
COPY --chown=node run.js /run/
USER node
CMD ["node", "--no-warnings", "/run/run.js"]
