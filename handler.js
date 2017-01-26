'use strict';

const fetch = require('node-fetch');
const aws = require('aws-sdk');

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
    // Most requests from Slack will be via POST
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
    TableName: "lighthouse-bot"
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
    TableName: "lighthouse-bot"
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
          console.log(res);
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


/**
 * Handle Slack events
 */
const handleEvent = (respond, webhookUrl, event) => {

  console.log(event);
  
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
  
  // Just use respond here?
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


/**
 * Map event types to proper names and descriptions
 */
const eventMappings = {

  // Team settings
  team_rename: event => ({
    name: 'Team renamed',
    desc: `The team was renamed to ${event.name}`,
  }),

  team_domain_change: event => ({
    name: 'Team domain changed',
    desc: `The team domain was changed to ${event.domain} so the URL is now ${event.url}`,
  }),

  email_domain_changed: event => ({
    name: 'Team email domain changed',
    desc: `The team email domain was changed to ${event.email_domain}`,
  }),


  // Channels
  channel_created: event => ({
    name: 'Channel created',
    desc: `<#${event.channel.id}|${event.channel.name}> was created by <@${event.channel.creator}>`,
  }),

  channel_deleted: event => ({
    name: 'Channel deleted',
    desc: `<#${event.channel}> was deleted`,
  }),

  channel_rename: event => ({
    name: 'Channel renamed',
    desc: `<#${event.channel.id}|${event.channel.name}> was renamed`,
  }),

  channel_archive: event => ({
    name: 'Channel archived',
    desc: `<#${event.channel}> was archived by <@${event.user}>`,
  }),

  channel_unarchive: event => ({
    name: 'Channel resurrected',
    desc: `<#${event.channel}> was un-archived by <@${event.user}>`,
  }),


  // Users
  team_join: event => {

    let userType;
    if (event.user.is_bot) userType = 'bot';
    else if (event.user.is_restricted) userType = 'guest';
    else if (event.user.is_ultra_restricted) userType = 'single channel guest';
    else userType = 'regular user';

    return {
      name: 'New user created',
      desc: `<@${event.user.id}> joined the team as a ${userType}`,
    };
  },

  user_change: event => ({
    name: 'User details updated',
    desc: `<@${event.user.id}>’s details were updated`,
  }),


  // User groups
  subteam_created: event => ({
    name: 'New user group created',
    desc: `The user group <@${event.subteam.id}> with the description "${event.subteam.description}" was created by <@${event.subteam.created_by}>`,
  }),

  subteam_updated: event => ({
    name: 'User group updated',
    desc: `The user group <@${event.subteam.id}> was updated by <@${event.subteam.updated_by}>`,
  }),


  // Files
  file_comment_added: event => ({
    name: 'File comment added',
    desc: `A file comment was added by <@${event.comment.user}>`,
  }),

  file_comment_edited: event => ({
    name: 'File comment edited',
    desc: `A file comment was edited by <@${event.comment.user}>`,
  }),

  file_public: event => ({
    name: 'File made public',
    desc: `The file <${event.file.permalink}|${event.file.title}> was made public`,
  }),


  // Emoji
  emoji_changed: event => {

    let name, desc;
    switch (event.subtype) {
      case 'add':
        name = 'Custom emoji added';
        desc = `A new custom emoji was created: :${event.name}:`
        break;
      case 'remove':
        if (event.names.length === 1) {
          name = 'Custom emoji removed';
          desc = `The custom emoji :${event.names[0]}: was removed`;
        } else {
          name = 'Custom emojis removed';
          desc = `The following custom emojis were removed: ${event.names[0].map(n => `:${n}:`).join(' ')}`;
        }
        break;
      default:
        name = 'Custom emoji event';
        desc = `Something happened with a custom emoji, but I'm not sure what. The event type was ${event.subtype}`
        break;        
    }

    return {
      name,
      desc,
    }
  },

};
