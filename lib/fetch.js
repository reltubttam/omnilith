r2 = require('r2');
const querystring = require('querystring');

/**
  * handle passing request to target machine
  */
module.exports = async (opts, targetMachine, req) => {
  const url = `${targetMachine.baseUrl}/${opts.internalPrefix}${req.path}?${querystring.stringify(req.query)}`;
  const headers = Object.assign({},
    req.headers, {
      'accept-encoding': '*',
    },
    opts.headersMask
  );
  delete headers['content-length'];

  const method = req.method;
  let body = undefined;
  if (method != 'GET' && method != 'HEAD') {
    body = JSON.stringify(req.body);
  }

  return fetch(url, {
    method,
    body,
    headers
  });
}
