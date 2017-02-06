'use strict';

// Libraries
const fetch = require('node-fetch');
const aws = require('aws-sdk');

const eventMappings = require('./events');

// env parameters
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;

// Instantiate DB connection
const dynamoDB = new aws.DynamoDB();


/**
 * Serverless entry point
 */
module.exports.handler = (event, context, callback) => {
  
  console.log(`Received request via ${event.httpMethod}`);

  const respond = sendResponse(callback);

  switch (event.httpMethod) {
    // Get requests are only used for OAuth
    case 'GET':
      oAuthHandler(respond, event);
      return;
    // Requests from Slack will be via POST
    case 'POST':
      postHandler(respond, event);
      return;
  };
};


/**
 * Get the record for a given team from the DB
 */
const getTeamFromDB = (teamId, cb) => {
  const dynamoParams = {
    Key: {
     "id": {
       S: teamId
      }, 
    },
    TableName: "slackmonitor"
  };

  dynamoDB.getItem(dynamoParams, (err, data) => {
    if (err) {
      console.log(`Error retrieving data for ${teamId} from DynamoDB`, err);
      cb(err);
    }
    else cb(data.Item);
  });
};


/**
 * Store a record for a given team in the DB
 */
const storeTeamInDB = (teamId, teamName, accessToken, webhookUrl, cb) => {

  const dynamoParams = {
    Item: {
      "id": {
        S: teamId
      },
      "teamName": {
        S: teamName
      },
      "accessToken": {
        S: accessToken
      },
      "webhookUrl": {
        S: webhookUrl
      }
    },
    TableName: "slackmonitor"
  };

  dynamoDB.putItem(dynamoParams, (err, data) => {
    if (err) {
      console.log(`Error storing data for ${teamName} in DynamoDB`, err);
      cb(err);
    }
    else cb(data);
  });
};


/**
 * Send a generic 200 OK response
 */
const sendResponse = callback => data => {
  callback(null, {
    statusCode: 200,
    body: JSON.stringify(data),
  });
}


/**
 * Handle the Slack OAuth process
 */
const oAuthHandler = (respond, event) => {

  // Attempt to extract the temporary code sent by Slack
  let code;
  try {
    code = event.queryStringParameters.code;
  } catch (e) {
    console.log(`Error retrieving code from ${event.queryStringParameters}`);
    respond({ error: `Couldn't retrieve code from ${event.queryStringParameters}`, event })
    return;
  }

  // Construct a URL to complete the process
  const url = `https://slack.com/api/oauth.access?client_id=${clientId}&client_secret=${clientSecret}&code=${code}&redirect_uri=${redirectUri}`

  // Make a request to the URL
  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data.ok) {
        console.log(`Error during OAuth:`, data);
        respond({
          error: `Could not complete OAuth process`
        });
      } else {
        console.log('OAuth completed successfully');
        storeTeamInDB(data.team_id, data.team_name, data.access_token, data.incoming_webhook.url, (res) => {
          respond('OAuth completed successfully');
        });
      }
    });
}


/**
 * Handle incoming POST requests
 */
const postHandler = (respond, event) => {

  // Attempt to parse the event data
  let postBody;
  try {
    postBody = JSON.parse(event.body);
  } catch (e) {
    console.log(`Error parsing event body`);
    respond({ error: `Error parsing event body: ${event.body}` });
    return;
  }

  // TODO: check the postBody.token matches the one Slack sent us during app registration

  // Handle the different types of request
  switch (postBody.type) {
    // Handle verification as part of the initial Slack app setup
    case 'url_verification':
      respond({ challenge: postBody.challenge });
      return;
    // Fire a notification to Slack about the event
    case 'event_callback':
      getTeamFromDB(postBody.team_id, team => {
        handleEvent(respond, team.webhookUrl.S, postBody.event)
      })
      return;
    // Otherwise error
    default:
      console.log(`Error: Received event type ${postBody.type}`);
      respond({ error: `Unrecognised type: ${postBody.type}` });
      return;
  };
}


/**
 * Handle Slack events
 */
const handleEvent = (respond, webhookUrl, event) => {

  const eventDetails = eventMappings[event.type](event);
  const response = {
    attachments: [
      {
        fallback: eventDetails.name,
        title: eventDetails.name,
        text: eventDetails.desc,
      }
    ]
  };
  
  // TODO: Just use respond here?
  fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(response)
  })
  .then(res => console.log('Successfully posted to Slack webhook'))
  .catch(err => console.log('Slack webhook returned an error:', err));

  respond();
};
