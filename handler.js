'use strict';

const timesToken = 'vhdAS4B9roqEjYS08Is1thmb';

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
  respond({
    message: 'Function executed successfully!',
    input: event,
  });
}


const postHandler = (respond, event) => {
  let postBody;
  try {
    postBody = JSON.parse(event.body);
  } catch (e) {
    respond({ error: e });
    return;
  }

  if (postBody.token !== timesToken) {
    respond({ error: `Error: Token didn't match` });
    return;
  }

  switch (postBody.type) {
    case 'url_verification':
      respond({ challenge: postBody.challenge });
      return;
    default:
      respond({ error: `Unrecognised type: ${postBody.type}` });
      return;
  };
}
