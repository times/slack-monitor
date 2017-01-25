'use strict';

const fetch = require('node-fetch');

const timesToken = 'vhdAS4B9roqEjYS08Is1thmb';

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;

module.exports.handler = (event, context, callback) => {

  console.log(`Received request via ${event.httpMethod}`);

  const respond = sendResponse(callback);

  switch (event.httpMethod) {
    case 'GET':
      getHandler(respond, event);
      return;
    case 'POST':
      postHandler(respond, event);
      return;
  };
};


const sendResponse = callback => data => {
  callback(null, {
    statusCode: 200,
    body: JSON.stringify(data),
  });
}


const getHandler = (respond, event) => {

  let code;
  try {
    code = event.queryStringParameters.code;
  } catch (e) {
    respond({ error: `Couldn't retrieve code from ${event.queryStringParameters}`, event })
    return;
  }

  const url = `https://slack.com/api/oauth.access?client_id=${clientId}&client_secret=${clientSecret}&code=${code}&redirect_uri=${redirectUri}`

  fetch(url)
    .then(res => res.json())
    .then(data => {
      console.log('OAuth completed successfully');
      respond({
        data
      });
    });
}


const postHandler = (respond, event) => {

  console.log(event.body);

  let postBody;
  try {
    postBody = JSON.parse(event.body);
  } catch (e) {
    console.log(`Error parsing event body`);
    respond({ error: `Error parsing event body: ${event.body}` });
    return;
  }

  if (postBody.token !== timesToken) {
    console.log(`Error: Token didn't match`);
    respond({ error: `Error: Token didn't match` });
    return;
  }

  switch (postBody.type) {
    case 'url_verification':
      respond({ challenge: postBody.challenge });
      return;
    default:
      console.log(`Received type ${postBody.type}`);
      respond({ error: `Unrecognised type: ${postBody.type}` });
      return;
  };
}
