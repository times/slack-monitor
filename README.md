# Slack Monitor

Slack Monitor is a Slack app that listens for Slack events and posts notifications into a channel.

Slack Monitor is built with [Serverless](http://serverless.com/framework/docs), which enables easy deployments to AWS.


### Structure

The main logic is contained in `handler.js`, which must expose a `handler` function for Serverless to call.

Since this app can be installed by multiple teams, a DynamoDB table is used for storage. Slack Monitor currently expects this table to already exist.

The app is installed via an "Add to Slack" button. `index.html` provides a minimal HTML page that hosts such a button with the correct scopes and parameters.

Serverless configuration is handled via `serverless.yml`.


### Development

    npm install


### Deployment

To deploy the main app to Lambda:

    serverless deploy

To deploy the `index.html` file containing the "Add to Slack" button, simply copy the file onto a web server such as S3.


### Install the app for your Slack team

Navigate to the index.html page. Click the "Add to Slack button" and follow the OAuth process.


### Contact

Elliot Davies (elliot.davies@the-times.co.uk)
