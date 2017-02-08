# Slack Monitor

Slack Monitor is a Slack app that listens for Slack events and posts notifications into a channel.

Slack Monitor is built with [Serverless](http://serverless.com/framework/docs), which enables easy deployments to AWS.

This repository contains the code for you to run your own instance of Slack Monitor inside your own AWS cloud, which you can then install for your team. This is not a hosted app.


### Structure

The main logic is contained in `src/handler.js`, which must expose a `handler` function for Serverless to call.

The mapping from Slack events to nicely-formatted notifications is handled in `events.js`.

The app is installed via an "Add to Slack" button. `index.html` provides a minimal HTML page that hosts such a button with the correct scopes and parameters.

Serverless configuration is handled via `serverless.yml`. Environment variables are stored in an `env.yml` file, which you should not commit. (An example is provided as `env-sample.yml`.)


### Development

    npm install


AWS Lambda currently supports NodeJS 4.3. If you want to use features from later versions of Node you will need to use Babel or a similar tool.


### Deployment

To deploy the main app to Lambda, check the `serverless.yml` configuration and then run:

    serverless deploy


To deploy to prod, you can pass the `stage` flag:

    serverless deploy -s prod


To deploy the `index.html` file containing the "Add to Slack" button, simply copy the file onto a web server such as S3.


#### AWS

Since this app can be installed by multiple teams, a DynamoDB table is used for storage. Slack Monitor currently expects this table to already exist and to be called `slackmonitor`. You should also check that the auto-generated IAM role assigned to your Lambda function has the correct permissions to read and write to DynamoDB.

#### Slack

You can register your instance of Slack Monitor with Slack by visiting [the API page](https://api.slack.com/apps) and creating a new app. The OAuth redirect URL and event subscription request URL should both point to your deployed Lambda function.

You can choose which events Slack Monitor will listen to on the Event Subscriptions page. Be sure that you have edited `index.html` so that the Add to Slack button requests the correct permission scopes for all the events you wish to listen to.


### Install the app for your Slack team

Once everything is configured and deployed, navigate to your hosted `index.html` page. Click the "Add to Slack button" and follow the OAuth process.


### Contributing

Please log issues on the GitHub repository. Contributions are welcome via pull requests and should preferably relate to an existing issue.

The biggest area of contribution currently required is to add more event mappings to `src/events.js`.


### Contact

Elliot Davies (elliot.davies@the-times.co.uk)
