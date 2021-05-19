jellobot is a a plugable irc bot written for node.js.

Primary features:

- makes it easy to write plugins and configure them from one config file
- code is live refreshed for zero-downtime updates, which also makes development much
  faster

Default plugins:

- repaste: repastes various paste services to gist.github.com and formats js code
- rng: picks a random item from a list
- js-eval: runs js code in a docker sandbox, and prints out the result

## Setup

To full run the bot, you'll need node.js (10.x recommended), docker (with your user
having permission to execute containers), and libmagic.

```sh
# Install libmagic on OSX
brew install libmagic
```

Then to get the dependencies run `npm install`.

Then create a config file...

### jellobot-config.json

```json
{
  "nick": "examplenick1951",
  "commandPrefix": "!",
  "githubToken": "...",
  "verbose": false,
  "userName": "examplenick1951",
  "password": "some-nickserv-password",
  "channels": [
    { "name": "##chan1", "requiresAuth": true }
  ]
}
```

## Run it!

```sh
node src/bot.js

# or with pm2
pm2 start --name my-bot src/bot.js
```
