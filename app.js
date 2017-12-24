"use strict";
exports.__esModule = true;
/// <reference path="./typings/index.d.ts" />

require('dotenv-extended').load();
const restify = require("restify");
//const sessions = require("client-sessions");
const session = require("restify-session")({
    debug: true,
    persist: true,
    connection: {
        port: process.env.REDIS_PORT,
        host: process.env.REDIS_HOST
    }
})
const connector = require("./bot/bot");
const jiraOAuth = require("./jira_oauth");

let server = restify.createServer();
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());
server.use(session.sessionManager);
/*
server.use(sessions({
    cookieName: "session",
    secret: "GDSHR2rwaf32",
    duration: 24 * 60 * 60 * 1000,
    activeDuration: 1000 * 60 * 5
}));
*/
server.listen(process.env.port || process.env.PORT || 3978, process.env.WEB_HOSTNAME, () => {
    console.log('listening to %s', server.url);
});
// Listen for messages from users 
server.post('/api/bot/messages', connector.listen());
server.get("/api/jira/callback", jiraOAuth.callback);
server.get("/api/jira/tokenRequest", jiraOAuth.requestToken);
server.get("/", (req, res) => { res.send({ hello: 'world' }); });