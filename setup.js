'use strict';

const util = require('util');
const fs = require('fs');
const debug = require('debug')('app:setup');

const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

const sign = util.promisify(jwt.sign);
const writeFile = util.promisify(fs.writeFile);

// kong admin API
const baseUrl = 'http://127.0.0.1:8001';

async function request(uri, { body, method = 'GET', headers = {} } = {}) {
  const url = baseUrl + uri;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers
    }
  };
  if (body) {
    if (typeof body === 'string') {
      options.body = body;
    } else {
      options.body = JSON.stringify(body);
    }
  }
  debug('request %s %s', method, url);
  const res = await fetch(url, options);
  const contentType = res.headers.get('content-type');

  // for (let i of res.headers) {
  //   console.log(i);
  // }

  let resBody;
  if (contentType.startsWith('application/json')) {
    resBody = await res.json();
  } else {
    debug('content type is %s', contentType);
    resBody = await res.text();
    // body can be blob, ignore here
  }
  return [res.ok, res.status, resBody];
}

async function createService() {
  const [ok, , body] = await request('/services', {
    method: 'POST',
    body: {
      name: 'httpbin',
      protocol: 'https',
      host: 'httpbin.org',
      port: 443,
      path: '/anything'
    }
  });
  debug('createService ok %s', ok);
  await writeJSON('data-createService.json', body);
}

async function addRoute() {
  const [ok, statusCode, body] = await request('/services/httpbin/routes', {
    method: 'POST',
    body: {
      name: 'httpbin-anything',
      paths: ['/anything']
    }
  });
  debug('addRoute ok %s statusCode %s', ok, statusCode);
}

async function listServices() {
  const [, , body] = await request('/services');
  debug('listServices %o', body);
  await writeJSON('data-listServices.json', body);
}

async function enableJWTPlugin(serviceName = 'httpbin') {
  // $ curl -X POST http://kong:8001/services/{service}/plugins \
  //     --data "name=jwt"
  const [ok, , body] = await request(`/services/${serviceName}/plugins`, {
    method: 'POST',
    body: {
      name: 'jwt'
    }
  });
  debug('enableJWTPlugin ok %s body %o', ok, body);
  await writeJSON('data-enableJWTPlugin.json', body);
}

async function createConsumer(username) {
  const [ok, , body] = await request('/consumers', {
    method: 'POST',
    body: {
      username
    }
  });
  debug('createConsumer ok %s body %o', ok, body);
  // body.id is the consumer id
  return body;
}

async function createJWTCredentialForConsumer(consumerId) {
  // POST http://kong:8001/consumers/{consumer}/jwt
  const [ok, statusCode, body] = await request(`/consumers/${consumerId}/jwt`, {
    method: 'POST',
    body: {
      consumer: consumerId,
      algorithm: 'HS256'
    }
  });
  debug(
    'createJWTCredentialForConsumer ok %s statusCode %s body %o',
    ok,
    statusCode,
    body
  );
  await writeJSON('data-createJWTCredentialForConsumer.json', body);
  // body.secret is the algo's privateKey
  return body;
  // console.log(JSON.stringify(body, null, 2));
}

async function signJWT(
  payload,
  privateKey = 'ZFKC5K3ES6jLQuH8UuQas5g1VLS7hO4n',
  key
) {
  const token = await sign(payload, privateKey, {
    algorithm: 'HS256',
    issuer: key
  });
  debug('jtw %s', token);
  return token;
}

async function writeJSON(f, o) {
  await writeFile(f, JSON.stringify(o, null, 2));
}

async function main() {
  await createService();
  await listServices();
  await addRoute();
  await enableJWTPlugin();
  const consumer = await createConsumer('haishan004');
  const cred = await createJWTCredentialForConsumer(consumer.id);
  const token = await signJWT(
    { a: 'hello', b: true, c: 123, d: new Date() },
    cred.secret,
    cred.key
  );
  // jwt debugger https://jwt.io
  console.log('\nTry run this:\n');
  console.log(
    `curl 'http://127.0.0.1:8000/anything' -H 'Host: httpbin.org' -H 'Authorization: Bearer ${token}'`
  );

  // should print
  // {
  //   "args": {},
  //   "data": "",
  //   "files": {},
  //   "form": {},
  //   "headers": {
  //     "Accept": "*/*",
  //     "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiaGVsbG8iLCJiIjp0cnVlLCJpYXQiOjE1NzExMjIyMzUsImlzcyI6InZobkQzc2dWMnhZb2F1OTdUd3NlNGl2T3l6Tk5SVmZBIn0.Vzxs__InTVYAsLQZQhHi9gEUJCG7aq-PDmVgqdauh94",
  //     "Host": "httpbin.org",
  //     "User-Agent": "curl/7.54.0",
  //     "X-Consumer-Id": "0ddb578a-4c12-40e3-a20e-dcba7a5ca39b",
  //     "X-Consumer-Username": "haishan002",
  //     "X-Forwarded-Host": "httpbin.org"
  //   },
  //   "json": null,
  //   "method": "GET",
  //   "origin": "172.29.0.1, 34.92.85.152, 172.29.0.1",
  //   "url": "https://httpbin.org/anything"
  // }

  // ```
  // curl 'http://127.0.0.1:8000/ip' -H 'Host: httpbin.org' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiaGVsbG8iLCJiIjp0cnVlLCJpYXQiOjE1NzExMTY2NDh9.MB5yNEnWjaw2I7G2k99DSjhS9qUmlh868sOqrkcLY00'
  // ```
}

main();
