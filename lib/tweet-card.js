/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module tweet-card
 * @license MPL-2.0
 */
"use strict";

const TweetCardContent = require("./tweet-card-content");

/**
 * @alias module:tweet-card.TweetCard
 */
class TweetCard {
    /**
     * @param {module:issue.Issue} issue - GitHub issue.
     * @param {module:config~Config} config - Project configuration.
     */
    constructor(issue, config) {
        /**
         * @type {module:issue.Issue}
         */
        this.issue = issue;
        /**
         * @type {module:config~Config}
         */
        this.config = config;
        this.checkValidity();
    }

    toString() {
        return this._content.toString();
    }

    updateContent() {
        this._content = new TweetCardContent(this.issue.content, this.config);
    }

    /**
     * Checks the card for its validity and sets the relevant labels.
     *
     * @returns {undefined}
     */
    checkValidity() {
        this.updateContent();
        const contentErrors = this.content.getCardError();
        if(contentErrors.length && !this.issue.hasLabel(this.config.labels.invalid)) {
            this.reportErrors(contentErrors);

            this.issue.addLabel(this.config.labels.invalid);
            this.issue.removeLabel(this.config.labels.ready);
        }
        else if(contentErrors.length === 0 && !this.issue.hasLabel(this.config.labels.ready)) {
            this.issue.addLabel(this.config.labels.ready);
            this.issue.removeLabel(this.config.labels.invalid);
        }
        else {
            //TODO update the existing error comment.
        }

        if(this.content.isRetweet &&
           !this.issue.hasLabel(this.config.labels.retweet)) {
            this.issue.addLabel(this.config.labels.retweet);
        }
        else if(!this.content.isRetweet &&
                this.issue.hasLabel(this.config.labels.retweet)) {
            this.issue.removeLabel(this.config.labels.retweet);
        }
    }

    /**
     * Post a comment to remind people to work on the card.
     *
     * @param {string} msg - Message to remind about.
     * @async
     * @returns {undefined}
     */
    remind(msg) {
        return this.comment(`:bell: *Friendly reminder*: ${msg}`);
    }

    /**
     * Assign a user to be responsible for this card.
     *
     * @param {string} user - User to assign.
     * @async
     * @returns {undefined}
     */
    assign(user) {
        return this.issue.assign(user);
    }

    /**
     * Report an error that happened with this card. Posts a comment on the
     * issue.
     *
     * @async
     * @param {[string]} errors - Errors to report.
     * @returns {undefined}
     */
    reportErrors(errors) {
        //TODO add some error info test
        return this.comment(`:warning: **Some actions have to be taken before this tweet is ready:**

${errors.map((e) => " - "+e).join("\n")}`);
    }

    reportError(action, error) {
        let stringified;
        if(error instanceof Error) {
            stringified = error.toString();
        }
        else if(typeof error === "object") {
            stringified = JSON.stringify(error, null, 2);
        }
        else if(typeof error === "string") {
            stringified = error;
        }
        return this.comment(`:warning: **An error was caught when trying to ${action} this issue:**
\`\`\`
${stringified}
\`\`\`
`);
    }

    /**
     * Posts a comment on the issue.
     *
     * @param {string} msg - Comment to post.
     * @async
     * @returns {undefined}
     */
    comment(msg) {
        return this.issue.comment(msg);
    }

    /**
     * @type {module:tweet-card-content.TweetCardContent}
     */
    get content() {
        return this._content;
    }

    /**
     * Saves the content from the TweetCardContent to GitHub.
     *
     * @returns {undefined}
     */
    flushContent() {
        this.issue.content = this._content.raw;
    }

    /**
     * The card is ready to tweet when there are no more parsing errors for its
     * contents and if scheduled the scheduled time is in the past or right now.
     *
     * @type {boolean}
     * @readonly
     */
    get canTweet() {
        return this.content.isValid &&
            (!this.content.isScheduled || this.content.date.getTime() <= Date.now());
    }
}

module.exports = TweetCard;
