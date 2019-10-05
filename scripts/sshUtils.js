const { promisify: pify } = require('util');
const os = require('os');
const fs = require('fs');
const assert = require('assert');
const Bluebird = require('bluebird');
const { Client } = require('ssh2');
const chalk = require('chalk');
const shellEscape = require('shell-escape');

const randId = () => `randId:${Math.floor(Math.random() * 2 ** 32)}`;

const readFile = pify(fs.readFile);

// Keep a list of connections
const conns = [];

class SshConnection {
  constructor(_opts) {
    const opts = { ..._opts };
    assert.ok(opts, `opts (first arg) are required`);
    assert.ok(typeof opts.host === 'string', `opts.host must be a string`);
    if (!opts.user) opts.user = 'ubuntu';
    this.opts = opts;
    this.createdStack = new Error('').stack;
    this.id = randId();
    this.pem = null;
  }

  async connect() {
    if (!this.opts.key && !this.opts.keyPath) {
      this.opts.keyPath = `${os.homedir()}/.ssh/id_rsa`;
    }

    await this.makeConnection();
  }

  async getPem() {
    if (this.pem) return this.pem;

    const key = this.opts.key;
    let pem = null;
    if (!key && this.opts.keyPath) {
      pem = await readFile(this.opts.keyPath, 'utf-8');
    } else if (key) {
      pem = key;
    } else {
      throw new Error(`Either key or keyPath must be provided`);
    }
    this.pem = pem;
    return pem;
  }

  async makeConnection() {
    if (this.conn) {
      throw new Error(`Already connected for this connection on ${this.opts.host}`);
    }

    const pem = await this.getPem();

    return new Promise((resolve, reject) => {
      const conn = new Client();
      this.conn = conn;

      conns.push({
        host: this.opts.host,
        conn,
        open: true,
        stack: this.createdStack,
        id: this.id,
      });

      conn.on('ready', () => {
        resolve(conn);
      });
      this.endPromise = new Promise((resolve) => {
        conn.on('close', (hadError) => {
          resolve(hadError);
          if (hadError) {
            console.error('ssh closed with unknown error');
            process.exit(7);
            reject();
          } else {
            this.opts.log.verbose(`ssh closed successfully`);
          }
        });
      });
      conn.on('error', reject);

      conn.connect({
        host: this.opts.host,
        port: 22,
        username: this.opts.user,
        privateKey: pem,
        readyTimeout: this.opts.readyTimeout || 15e3,
      });
    });
  }
  async ftp() {
    if (!this._ftpPromise) {
      this._ftpPromise = new Promise((resolve, reject) => {
        this.conn.sftp((err, sc) => {
          if (err) return reject(err);
          Bluebird.promisifyAll(sc);
          resolve(sc);
        });
      });
    }
    return this._ftpPromise;
  }

  async end() {
    this.conn.end();
    if (this._ftpPromise) {
      (await this._ftpPromise).end();
    }
    const matchingIndex = conns.findIndex((x) => (x.conn = this.conn));
    conns.splice(matchingIndex, 1);
    return this.endPromise;
  }

  _escape(args) {
    if (!Array.isArray(args)) return args;
    return shellEscape(args.map((x) => this._escape(x)));
  }

  async exec(_command, _opts = {}) {
    const opts = { ...this.opts, ..._opts };
    return new Promise((resolve, reject) => {
      let command = _command;
      if (Array.isArray(command)) command = this._escape(command);

      // Add sudo if it's not already there
      command = this.validateAndFixCommand(command, opts);

      const execOpts = { pty: !!opts.root };
      if (opts.cwd) execOpts.cwd = opts.cwd;

      this.conn.exec(command, execOpts, (err, stream) => {
        if (err) return reject(err);
        if (!opts.silent) {
          let tempLog = `Running command: ${command}`;
          if (opts.name) tempLog = `Running command on ${opts.name}: ${command}`;
          this.opts.log.verbose(tempLog);
        }

        let events = [];
        let stdout = '';
        stream.on('data', (s) => {
          if (opts.log.flags.debug) {
            if (!opts.silent) {
              process.stdout.write(String(s));
            }
          } else {
            events.push({ type: 'stdout', value: String(s) });
          }
          stdout += String(s);
        });
        stream.stderr.on('data', (s) => {
          if (opts.log.flags.verbose) {
            if (!opts.silent) {
              process.stderr.write(String(s));
            }
          } else {
            events.push({ type: 'stderr', value: String(s) });
          }
        });
        stream.on('exit', (code) => {
          if (code) {
            if (!opts.silent) {
              console.error(
                chalk.red(`Failed to execute command with status code ${code}`),
              );
            }
            let res = '';
            events.forEach(({ type, value }) => {
              res += value;
              if (opts.log.flags.debug && !opts.silent) {
                if (type === 'stdout') process.stdout.write(value);
                else process.stderr.write(value);
              }
            });
            reject({ code, res });
            return;
          } else resolve(stdout);
        });
      });
    });
  }

  async writeFileRoot(destPath, content) {
    const tempPath = `/tmp/${Math.random()}${Math.random()}.txt`;

    const sftp = await this.ftp();
    await sftp.writeFileAsync(tempPath, content);
    await this.exec(`cp ${tempPath} ${destPath}`, { root: true, silent: true });
  }

  async readFileRoot(filePath) {
    try {
      const text = await this.exec(`cat ${filePath}`, { root: true, silent: true });
      return text.replace(/\r\n/g, '\n');
    } catch (e) {
      throw Object.assign(new Error(e.message), { type: 'not_found' });
    }
  }

  validateAndFixCommand(_command, opts) {
    let command = _command;
    if (/apt-get install/.test(command) && !/-y/.test(command)) {
      throw new Error(`Attempted to run command ${command} without the -y flag`);
    }
    if (opts.root && !/\bsudo\b/.test(command)) command = `sudo ${command}`;
    return command;
  }

  async writeIfDifferentAndReturnChanged(path, content, owner) {
    // create the directory if needed
    await this.exec(
      `mkdir -p ${path
        .split('/')
        .slice(0, -1)
        .join('/')}`,
      { root: true, silent: true },
    );

    let current = null;
    try {
      current = await this.readFileRoot(path);
    } catch (e) {
      // do nothing
    }
    if (current && current.trim() === content.trim()) {
      return false;
    }
    await this.writeFileRoot(path, content);
    if (owner) {
      await this.exec(`chown ${owner}:${owner} "${path}"`, { root: true });
    }
    return true;
  }

  async fileExists(path) {
    const ftp = await this.ftp();
    try {
      await ftp.statAsync(path);
      return true;
    } catch (e) {
      return false;
    }
  }
}

module.exports = SshConnection;
