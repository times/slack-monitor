'use strict';

const fetch = require('node-fetch');
const aws = require('aws-sdk');

// const timesToken = 'vhdAS4B9roqEjYS08Is1thmb';

// env parameters
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;

// Instantiate DB connection
const dynamoDB = new aws.DynamoDB();

// Get the record for a given team from the DB
const getTeamFromDB = (teamId, cb) => {
  const dynamoParams = {
    Key: {
     "id": {
       S: teamId
      }, 
    }, 
    TableName: "lighthouse-bot"
  };

  dynamoDB.getItem(dynamoParams, (err, data) => {
    if (err) {
      console.log(`Error retrieving data for ${teamId} from DynamoDB`, err);
      cb(err);
    }
    else {
      console.log(`Retrieved data for ${teamId} from DynamoDB:`, data);
      cb(data.Item);
    }
  });
};

// Store a record for a given team in the DB
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
    TableName: "lighthouse-bot"
  };

  dynamoDB.putItem(dynamoParams, (err, data) => {
    if (err) {
      console.log(`Error storing data for ${teamName} in DynamoDB`, err);
      cb(err);
    }
    else {
      console.log(`Stored data for ${teamName}:`, data);
      cb(data);
    }
  });
};


// Entry point
module.exports.handler = (event, context, callback) => {

  console.log(`Received request via ${event.httpMethod}`);

  const respond = sendResponse(callback);

  switch (event.httpMethod) {
    // Get requests are only used for OAuth
    case 'GET':
      oAuthHandler(respond, event);
      return;
    // Most requests from Slack will be via POST
    case 'POST':
      postHandler(respond, event);
      return;
  };
};


// Send a generic 200 OK response
const sendResponse = callback => data => {
  callback(null, {
    statusCode: 200,
    body: JSON.stringify(data),
  });
}


// Handle the Slack OAuth process
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
          console.log(res);
          respond(res);
        });
      }
    });
}


// Handle incoming POST requests
const postHandler = (respond, event) => {

  console.log(`POST body:`, event.body);

  // Attempt to parse the event data
  let postBody;
  try {
    postBody = JSON.parse(event.body);
  } catch (e) {
    console.log(`Error parsing event body`);
    respond({ error: `Error parsing event body: ${event.body}` });
    return;
  }

  // Get the record for the team that sent the request
  // getTeamFromDB(...)
  // const teamToken = '...';

  // Check the token matches to avoid forged requests
  // if (postBody.token !== teamToken) {
  //   console.log(`Error: Token didn't match`);
  //   respond({ error: `Error: Token didn't match` });
  //   return;
  // }

  // Handle the different types of request
  switch (postBody.type) {
    // Handle verification as part of the initial Slack app setup
    case 'url_verification':
      respond({ challenge: postBody.challenge });
      return;
    // Fire a notification to Slack about the event
    case 'event_callback':
      console.log(`Saw event ${postBody.event.type}`);

      getTeamFromDB(postBody.team_id, team => {
        console.log('Team', team);
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


const handleEvent = (respond, webhookUrl, event) => {

  let eventName = event.type; // Default
  let eventDesc = '';

  switch (event.type) {
    // Channels
    case 'channel_created':
      eventName = 'Channel created';
      eventDesc = `<#${event.channel.id}|${event.channel.name}> was created by <@${event.channel.creator}>`;
      break;
    case 'channel_deleted':
      eventName = 'Channel deleted';
      eventDesc = `<#${event.channel}> was deleted`;
      break;
    case 'channel_rename':
      eventName = 'Channel renamed';
      eventDesc = `<#${event.channel.id}|${event.channel.name}> was renamed`;
      break;
    case 'channel_archive':
      eventName = 'Channel archived';
      eventDesc = `<#${event.channel}> was archived by <@${event.user}>`;
      break;
    case 'channel_unarchive':
      eventName = 'Channel resurrected';
      eventDesc = `<#${event.channel}> was un-archived by <@${event.user}>`;
      break;
    // Files
    case 'file_comment_added':
      eventName = 'File comment added';
      eventDesc = `A file comment was added by <@${event.comment.user}>`;
  };

  const response = {
    attachments: [
      {
        fallback: eventName,
        title: eventName,
        text: `${eventDesc}.`
      }
    ]
  };
  
  // Just respond() here?
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
