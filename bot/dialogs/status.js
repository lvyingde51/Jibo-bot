"use strict";

const builder = require('botbuilder');
const Jira = require("../../jira/jira");
const lib = new builder.Library('status');
const _ =  require('underscore');
const helpers = require("../../common/helpers");
lib.dialog('ask', [ 
    (session, args) => {
        if(!args || !args.redo) {
            session.conversationData.status = [];
        }
        let original = _.map(session.conversationData.statuses, (status) => {return status.toLowerCase();});
        let selected = _.map(session.conversationData.status, (status) => {return status.toLowerCase();});
        const diff = _.difference(original, selected);
        if (diff.length > 0) {
            builder.Prompts.choice(session,"please choose a status:",
                diff,
                builder.ListStyle.button);
        } else {
            session.endDialog("you've selected all available statuses");
        }
        
    },
    (session, results) => {
        session.conversationData.status.push(results.response.entity);
        builder.Prompts.choice(session,"would you like to choose additional status?",
       "yes|no",
        builder.ListStyle.button);
    },
    (session, results) => {
        if(results.response.entity == "yes") {
            session.replaceDialog("status:ask", {redo: true});
        }
        else{
            session.endDialog(); 
        }
    }
]);

lib.dialog('check', 
    (session, args) => {
        try {
        if(args) {  
                session.conversationData.status = session.conversationData.status || [];
                let original = _.map(session.conversationData.statuses, (status) => {return status.toLowerCase();});
                args = _.isArray(args) ? _.map(args, (status) => {return status.toLowerCase();}): [args];
                const diff = _.difference(args, original);
                if (diff.length > 0) {
                    session.send("Requested statuses ("+ diff.join(", ") +") are not available in Jira");
                    session.conversationData.status = _.intersection(args, original) || [];
                    session.replaceDialog("status:ask", {redo: true});
                } else {
                    session.conversationData.status = helpers.checkAndApplyReversedStatus(original, args);
                    session.endDialog();
                }    
        } else {
            session.endDialog();
        }
    } catch (error) {
        session.endDialog("Oops! an error accurd: %s, while checking the statuses, please try again later", error);
    }
});

lib.dialog('list', 
    async (session,args, next) => {
        try {
            session.userData.oauth = session.userData.oauth || {};
            let jira = new Jira({
                oauth: {
                    access_token: session.userData.oauth.accessToken,
                    access_token_secret: session.userData.oauth.accessTokenSecret,
                }
            });
        
            const statuses = await jira.listStatus();
            session.conversationData.statuses = _.map(statuses, (status) => { return status.name;});
            session.endDialog();
        }
        catch(error) {
            session.endDialog("Oops! an error accurd: %s, while retrieving the statuses, please try again later", error);
        }
    });


// Export createLibrary() function
module.exports.createLibrary = () => {
    return lib.clone();
};