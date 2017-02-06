# Slack Monitor

Slack Monitor is a Slack app that listens for Slack events and posts notifications into a channel.

Slack Monitor is built with [Serverless](http://serverless.com/framework/docs), which enables easy deployments to AWS.


### Structure

The main logic is contained in `src/handler.js`, which must expose a `handler` function for Serverless to call.

Since this app can be installed by multiple teams, a DynamoDB table is used for storage. Slack Monitor currently expects this table to already exist and to be called `slackmonitor`.

The mapping from Slack events to nicely-formatted notifications is handled in `events.js`.

The app is installed via an "Add to Slack" button. `index.html` provides a minimal HTML page that hosts such a button with the correct scopes and parameters.

Serverless configuration is handled via `serverless.yml`.


### Development

    npm install


AWS Lambda currently supports NodeJS 4.3. If you want to use features from later versions of Node you will need to use Babel or a similar tool.


### Deployment

To deploy the main app to Lambda, check the `serverless.yml` configuration and then run:

    serverless deploy

To deploy the `index.html` file containing the "Add to Slack" button, simply copy the file onto a web server such as S3.


### Install the app for your Slack team

Navigate to the index.html page. Click the "Add to Slack button" and follow the OAuth process.


### Contributing

Please log issues on the GitHub repository. Contributions are welcome via pull requests and should preferably relate to an existing issue.


### Contact

Elliot Davies (elliot.davies@the-times.co.uk)
