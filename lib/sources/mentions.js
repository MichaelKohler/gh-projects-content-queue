/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const Source = require("./source");
const TweetCardContent = require("../tweet-card-content");

class MentionsSource extends Source {
    static getTweetPermalink(tweet) {
        return `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`;
    }

    constructor(repo, twitterAccount) {
        super(repo, twitterAccount);

        twitterAccount.on("mention", async (tweet) => {
            const [ columns, columnIds ] = await Promise.all([
                repo.board.columns,
                repo.board.columnIds
            ]);
            const reactionColumn = columns[columnIds.reactions];

            const tweetPermalink = MentionsSource.getTweetPermalink(tweet);
            // Don't create an issue if there's already one for the tweet
            //TODO this misses out on closed issues, thus re-creating some issues.
            const openIssues = await repo.board.issues.issues;
            for(const issue of openIssues.values()) {
                if(issue.content.includes(TweetCardContent.REPLY_TO)) {
                    const content = new TweetCardContent(issue.content, {});
                    if(content.isReply && content.replyTo == tweetPermalink) {
                        //TODO only do this if the issue is open.
                        if(!reactionColumn.hasCard(issue.id)) {
                            await repo.board.addCard(issue, reactionColumn);
                        }
                        return;
                    }
                }
            }
            //TODO due date
            const issueText = TweetCardContent.createCard(`Prepare a reply for the request by the user ${tweet.user.screen_name}:
> ${tweet.text}`, false, null, null, tweetPermalink);

            //TODO somehow this goes to the wrong column
            await repo.board.createCard(`Mention by ${tweet.user.screen_name}`, issueText.toString(), reactionColumn, "top").catch(console.error);
            //TODO assign user to returned card
        });
    }
}
module.exports = MentionsSource;