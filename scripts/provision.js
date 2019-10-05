const fs = require('fs');
const os = require('os');
const assert = require('assert');
const SshConnection = require('./sshUtils');

const user = process.argv[2];
const host = process.argv[3];
const pubKeyFile = process.argv[4] || `${os.homedir()}/.ssh/id_rsa.pub`;

assert(user, `User ($1) must be provided`);
assert(host, `Host ($2) must be provided`);

async function installGeneralDeps({ ssh, log }) {
  log.info(`Installing native build deps`);
  await ssh.exec(`apt-get install -y build-essential libicu-dev`);
}

async function installNode({ ssh, log }) {
  const nodeVersion = 'v8.9.0';
  const nodeUrl = `https://nodejs.org/dist/${nodeVersion}/node-${nodeVersion}-linux-x64.tar.gz`;
  try {
    const version = (await ssh.exec(`node -v 2>&1`)).trim();
    log.debug(`Node.js version ${version} is installed, expected ${nodeVersion}`);
    if (version === nodeVersion) {
      log.info(`Skipping node.js install`);
      return;
    }
  } catch (e) {
    log.info(`Node.js is not installed`);
  }

  // note: don't remove wget install; it's also used by serverUpdateBot
  log.debug(`Installing wget`);
  await ssh.exec(`apt-get install wget -y`, { root: true });

  log.info(`Downloading node binary`);
  await ssh.exec(`rm node-*.tar* >/dev/null 2>&1 || true; wget "${nodeUrl}" --quiet`);

  log.info(`Extracting node binary`);
  await ssh.exec(`tar --strip-components 1 -xzvf node-v* -C /usr/local`, {
    root: true,
  });
}

async function installPython({ ssh, log }) {
  log.debug(`Installing python`);
  await ssh.exec(`sudo apt-get install -y python-minimal python3`, { root: true });
}

async function installPm2({ ssh, log }) {
  const pm2Version = '2.7.2';
  try {
    const version = (await ssh.exec(`pm2 --version 2>&1`)).trim();
    log.debug(`Expected pm2 ${pm2Version} and found ${version}`);
    if (version === pm2Version) {
      log.info(`Skipping pm2 install`);
      return;
    }
    // pm2 is installed but not the right version
    log.info(`Changing pm2 version from ${version} to ${pm2Version}`);
    await ssh.exec(`pm2 save`);
    await ssh.exec(`npm install --global pm2@${pm2Version}`, { root: true });
    await ssh.exec(`pm2 update`);
    await ssh.exec(`pm2 ls`);
    log.info(`pm2 upgraded`);
    return;
  } catch (e) {
    log.info(`Node.js is not installed`);
  }

  // pm2 not installed, install it
  log.info(`Installing pm2`);
  await ssh.exec(`npm install --global pm2@${pm2Version}`, { root: true });
}

async function installDocker({ ssh, log }) {
  try {
    log.info(`Checking if docker is installed.`);
    await ssh.exec(`docker --version`, { root: true });
  } catch (e) {
    log.info(`Installing docker.`);
    await ssh.exec(
      `curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add`,
      { root: true },
    );
    await ssh.exec(
      `sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"`,
      { root: true },
    );
    await ssh.exec(`sudo apt-get update`, { root: true });
    await ssh.exec(`apt-cache policy docker-ce`, { root: true });
    await ssh.exec(`sudo apt-get install -y docker-ce`, { root: true });
  }
  try {
    log.info(`Creating docker group`);
    await ssh.exec(`sudo groupadd docker`, { root: true });
  } catch (e) {
    // do nothing
  }
  try {
    log.info(`Adding jellobot to docker group`);
    await ssh.exec(`sudo gpasswd -a jellobot docker`, { root: true });
  } catch (e) {
    // Do nothing
  }
}

async function run() {
  const log = {
    flags: { debug: true, verbose: true },
    verbose: () => console.error,
    info: console.error,
    debug: console.error,
  };
  const ssh = new SshConnection({ host, user, log });

  try {
    await ssh.connect();

    try {
      await ssh.exec(`sudo groupadd jellobot`, { root: true });
    } catch (e) {
      // do nothing
    }

    try {
      await ssh.exec(
        `useradd -g jellobot --home-dir /home/jellobot --shell /bin/bash jellobot`,
        { root: true },
      );
    } catch (e) {
      console.error(e);
    }

    await ssh.exec(`mkdir -p /home/jellobot/.ssh`);
    await ssh.exec(`chown -R jellobot:jellobot /home/jellobot/`);

    await ssh.exec(`sudo apt-get update`, { root: true });

    const pubKey = await fs.readFileSync(pubKeyFile, 'utf-8');
    const sftp = await ssh.ftp();
    const authKeyPath = '/home/jellobot/.ssh/authorized_keys';
    await sftp.writeFile(authKeyPath, pubKey);

    await ssh.exec(`chmod 400 ${authKeyPath}`);
    await ssh.exec(`chown jellobot:jellobot ${authKeyPath}`);

    await installGeneralDeps({ ssh, log });
    await installPython({ ssh, log });
    await installNode({ ssh, log });
    await installPm2({ ssh, log });
    await installDocker({ ssh, log });
  } finally {
    await ssh.end();
  }
}

run().catch((e) => {
  console.error(`Fatal error`);
  console.error(e);
  process.exit(7);
});
