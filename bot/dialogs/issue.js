"use strict";

const util = require('util');
const builder = require('botbuilder');
const Jira = require("../../jira/jira");
const lib = new builder.Library('issue');
const _ = require('underscore');
const helpers = require("../../common/helpers");

lib.dialog('getByKey', [
     (session, args, next) => {
         if(args && args.redo) {
            builder.Prompts.text(session, "Issue number doesn't exist. Please enter a valid issue number");
         } else if (args && args.entities) {
            const issueNumber = builder.EntityRecognizer.findEntity(args.entities, 'issueNumber') || undefined;
            if(!issueNumber) {
                builder.Prompts.text(session, 'Please enter the issue number');
            } else {
                session.dialogData.issueNumber = helpers.checkIssueNumberFormat(issueNumber.entity.replace(/[^0-9a-zA-Z\-]/gi, ''));
                if(!session.conversationData.issueNumber) {
                    builder.Prompts.text(session, 'Please enter the issue number again');
                } else {
                    next();
                }
            }
         } else {
            builder.Prompts.text(session, 'Please enter the issue number');
         }
    },
    async (session,results) => {
        try {
            session.userData.oauth = session.userData.oauth || {};
            let jira = new Jira(session.userData.jira);
            const issueNumber = session.dialogData.issueNumber || results.response;
            const issue = await jira.findIssue(issueNumber, "", "id,key,summary,status,assignee,duedate,resolutiondate,issuetype");
            if (issue) {
                const assignee = !_.isNull(issue.fields.assignee) ? issue.fields.assignee.displayName : "unassigned";
                let card = new builder.HeroCard(session)
                        .title(issue.key)
                        .subtitle(issue.fields.summary)
                        .text(issue.fields.issuetype.name + "-" + issue.fields.status.name + "\n\n" +
                                "Assignee: " + assignee + "\n\n" +
                                "End date: " + issue.fields.duedate + "\n\n" +
                                "Resolution date: " + issue.fields.resolutiondate
                            );
                let msg = new builder.Message(session);
                msg.attachmentLayout(builder.AttachmentLayout.list/*.carousel*/)
                msg.attachments([card]);
                session.send(msg);
                session.endDialog("Anything else I can help with?");
            } else {
                session.replaceDialog("issue:getByKey", {redo: true});
            }
        } catch(error) {
            if(error.statusCode == 404) {
                session.replaceDialog("issue:getByKey", {redo: true});
            } else if (error.message == process.env.JIRA_AUTHERR) {
                session.replaceDialog("user-profile:initiate", {redo: true});
            } else {
                session.endDialog("Oops! %s. Please try again", (error.error && _.first(error.error.errorMessages)) || error.message || error);
            }
        }
    }
]);

lib.dialog('getDevStatus', [
    (session, args) => {
        if(args.redo) {
            builder.Prompts.text(session, "Issue number doesn't exist. Please enter a valid issue number");
        } else {
            builder.Prompts.text(session, 'Please enter the issue number');
        }
    },
    async (session, results, next) => {
        try {
            if (results && results.response) {
                session.userData.oauth = session.userData.oauth || {};
                let jira = new Jira(session.userData.jira);
                const issueNumber = results.response;
                const issue = await jira.findIssue(issueNumber, "", "id");
                if (issue && issue.id) {
                    session.dialogData.issueId = issue.id;
                    next();
                } else {
                    session.replaceDialog("issue:getDevStatus", {redo: true});
                }
            } else {
                session.replaceDialog("issue:getDevStatus", {redo: true});
            }
        } catch (error) {
            if(error.statusCode == 404) {
                session.replaceDialog("issue:getDevStatus", {redo: true});
            } else if (error.message == process.env.JIRA_AUTHERR) {
                session.replaceDialog("user-profile:initiate", {redo: true});
            } else {
                session.endDialog("Oops! %s. Please try again", (error.error && _.first(error.error.errorMessages)) || error.message || error);
            }
        }
     },
    (session, results) => {
        builder.Prompts.choice(session,"Please choose an application type:",
        ["stash", "bitbucket"],
        builder.ListStyle.button);
    },
    (session, results) => {
        session.dialogData.applicationType = results.response.entity;
        builder.Prompts.choice(session,"Please choose an application type:",
        ["repository", "pullrequest"],
        builder.ListStyle.button);
    },
    async (session,results) => {
       try {
           session.dialogData.dataType = results.response.entity;
           session.userData.oauth = session.userData.oauth || {};
           let jira = new Jira(session.userData.jira);
           const devStatus = await jira.getDevStatusDetail(
                                    session.dialogData.issueId,
                                    session.dialogData.applicationType,
                                    session.dialogData.dataType);
           console.log(devStatus);
           /*
           let cards = _.map(issues, (issue,i) => {
               const assignee = !_.isNull(issue.fields.assignee) ? issue.fields.assignee.displayName : "unassigned";
               return new builder.HeroCard(session)
                   .title(issue.key)
                   .subtitle(issue.fields.summary)
                   .text(issue.fields.status.name + "\n\n" +
                           "Assignee: " + assignee + "\n\n" +
                           "End date: " + issue.fields.duedate + "\n\n" +
                           "Resolution date: " + issue.fields.resolutiondate
                       );
           });
           
           let msg = new builder.Message(session);
           msg.attachmentLayout(builder.AttachmentLayout.list)
           msg.attachments(cards);
           session.send(msg);
           */
           session.send(devStatus.detail);
           session.endDialog("Anything else I can help with?");
       } catch(error) {
            if(error.statusCode == 404) {
                session.replaceDialog("issue:getDevStatus", {redo: true});
            } else if (error.message == process.env.JIRA_AUTHERR) {
                session.replaceDialog("user-profile:initiate", {redo: true});
            } else {
                session.endDialog("Oops! %s. Please try again", (error.error && _.first(error.error.errorMessages)) || error.message || error);
            }
       }
   }
]);

lib.dialog('getDevSummary', [
    (session, args) => {
        if (args.redo) {
            builder.Prompts.text(session, "Issue number doesn't exist. Please enter a valid issue number");
        } else {
            builder.Prompts.text(session, 'Please enter the issue number');
        }
    },
    async (session, results, next) => {
        try {
            if (results && results.response) {
                session.userData.oauth = session.userData.oauth || {};
                let jira = new Jira(session.userData.jira);
                const issueNumber = results.response;
                const issue = await jira.findIssue(issueNumber, "", "id");
                if (issue && issue.id) {
                    session.dialogData.issueId = issue.id;
                    next();
                } else {
                    session.replaceDialog("issue:getDevSummary", {redo: true});
                }
            } else {
                session.replaceDialog("issue:getDevSummary", {redo: true});
            }
        } catch (error) {
            if(error.statusCode == 404) {
                session.replaceDialog("issue:getDevSummary", {redo: true});
            } else if (error.message == process.env.JIRA_AUTHERR) {
                session.replaceDialog("user-profile:initiate", {redo: true});
            } else {
                session.endDialog("Oops! %s. Please try again", (error.error && _.first(error.error.errorMessages)) || error.message || error);
            }
        }
     },
    async (session,results) => {
       try {
            session.userData.oauth = session.userData.oauth || {};
            let jira = new Jira(session.userData.jira);
            const devSummary = await jira.getDevStatusSummary(session.dialogData.issueId);
            /* here goes the handling of the retreived data*/
            session.endDialog("Anything else I can help with?");
       } catch(error) {
            if(error.statusCode == 404) {
                session.replaceDialog("issue:getDevSummary", {redo: true});
            } else if (error.message == process.env.JIRA_AUTHERR) {
                session.replaceDialog("user-profile:initiate", {redo: true});
            } else {
                session.endDialog("Oops! %s. Please try again", (error.error && _.first(error.error.errorMessages)) || error.message || error);
            }
       }
   }
]);

lib.dialog('get', [
    async (session,args, next) => {
        try {
            session.userData.oauth = session.userData.oauth || {};
            let jira = new Jira(session.userData.jira);
            session.conversationData.projects = session.userData.projects;
            const count = await jira.getCount(session.conversationData);
            if(count >= 10) { 
                builder.Prompts.choice(session, "There are " + count + " tickets, would you like to add some additinal filters?",
                "yes|no",
                builder.ListStyle.button);
            } else if (count == 0) {
                session.endDialog("There are no tickets matching the search parameters, please use different paramaters");
                session.clearDialogStack();
            }
            else {
                session.replaceDialog("issue:fetch", session.conversationData);
            }
        }
        catch(error) {
            if (error.message == process.env.JIRA_AUTHERR) {
                session.replaceDialog("user-profile:initiate", {redo: true});
            } else {
                session.endDialog("Oops! %s. Please try again", (error.error && _.first(error.error.errorMessages)) || error.message || error);
                session.clearDialogStack();
            }
        }
        
    },
    (session, results, next) => {
        if (results.response) {
            if(results.response.entity == "yes") {
                session.replaceDialog("filter:/", session.conversationData);
            }
            else{
                session.replaceDialog("issue:fetch", session.conversationData);
            }
        }
        else {
            session.replaceDialog("issue:fetch", session.conversationData);
        }
    },
]);

lib.dialog("fetch", async (session, args) => {
    try {
        session.userData.oauth = session.userData.oauth || {};
        let jira = new Jira(session.userData.jira);
        session.conversationData.projects = session.userData.projects;
        session.sendTyping();
        const result = await jira.searchJira(session.conversationData);
        let cards = _.map(result.issues, (issue,i) => {
            const assignee = !_.isNull(issue.fields.assignee) ? issue.fields.assignee.displayName : "unassigned";
            return new builder.HeroCard(session)
                .title(issue.key)
                .subtitle(issue.fields.summary)
                .text(issue.fields.issuetype.name + "-" + issue.fields.status.name + "\n\n" +
                        "Assignee: " + assignee + "\n\n" +
                        "End date: " + issue.fields.duedate + "\n\n" +
                        "Resolution date: " + issue.fields.resolutiondate
                    );
        });
        let msg = new builder.Message(session);
        msg.text("Here you go!")
        msg.attachmentLayout(builder.AttachmentLayout.list/*.carousel*/)
        msg.attachments(cards);
        msg.text("Total of %s tickets", cards.length);
        session.send(msg);
        session.endDialog("Anything else I can help with?");
    }
    catch(error) {
        if (error.message == process.env.JIRA_AUTHERR) {
            session.replaceDialog("user-profile:initiate", {redo: true});
        } else {
            session.endDialog("Oops! %s. Please try again", (error.error && _.first(error.error.errorMessages)) || error.message || error);
            session.clearDialogStack();
        }
    }
});

// Export createLibrary() function
module.exports.createLibrary =  () => {
    return lib.clone();
};