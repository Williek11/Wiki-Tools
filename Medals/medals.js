"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const wiki_js_1 = __importDefault(require("./wiki.js"));
function errorHandler(e) {
    console.error(e);
}
var array = {
    containsAllEntriesOf: function (array1, array2) {
        for (var i = 0, l = array2.length; i < l; i++) {
            if (array1.indexOf(array2[i]) === -1) {
                return false;
            }
        }
        return true;
    },
    containsOneEntryOf: function (array1, array2) {
        for (var i = 0, l = array2.length; i < l; i++) {
            if (array1.indexOf(array2[i]) > -1) {
                return true;
            }
        }
        return false;
    },
    checkIfUserRepeats: function (users) {
        const repeatedUsers = [];
        for (var i = 0, l = users.length; i < l; i++) {
            const name = users[i].name;
            for (var j = i + 1; j < l; j++) {
                if (name === users[j].name) {
                    repeatedUsers.push([name, i, j]);
                }
            }
        }
        return repeatedUsers;
    }
};
function getPartialUsers(usernames) {
    const USERS_PER_REQUEST = 100;
    var processedUsers = 0;
    var users = {};
    function parseUser(userData) {
        users[userData.name] = {};
        users[userData.name].name = userData.name;
        users[userData.name].id = userData.userid;
        users[userData.name].groups = userData.groups || [];
        // Blocked isn't technically a group, so it is now
        if (userData.blockid !== undefined) {
            users[userData.name].groups.push('blocked');
        }
    }
    function addPartialUsersWithOffset() {
        return new Promise(function (resolve, reject) {
            var params = {
                action: 'query',
                list: 'users',
                ususers: usernames
                    .slice(processedUsers, processedUsers + USERS_PER_REQUEST)
                    .join('|'),
                usprop: 'groups|blockinfo',
            };
            wiki_js_1.default.get(params, true)
                .then((response) => {
                const usersData = response.data.query.users;
                usersData.forEach(userData => parseUser(userData));
                processedUsers += USERS_PER_REQUEST;
                resolve();
            })
                .catch(errorHandler);
        });
    }
    return new Promise(async function (resolve, reject) {
        for (var i = 0, l = Math.ceil(usernames.length / USERS_PER_REQUEST); i < l; i++) {
            await addPartialUsersWithOffset();
        }
        resolve(users);
    });
}
function getAllLocalUsers() {
    const USERS_PER_REQUEST = 100;
    // To assess the expected time we
    // have to wait until the script
    // is done processing the users
    const WAIT_PER_USER = 610; // ms
    var users = [];
    var usersFoundSoFar = 0;
    var totalUsers = 0;
    function getUsernamesWithOffset() {
        return wiki_js_1.default.getUsersList({
            limit: USERS_PER_REQUEST,
            offset: usersFoundSoFar,
        });
    }
    function getAllUsernames() {
        const usernames = [];
        function addUsersToList(value) {
            var data = value.listuserssearchuser;
            for (var i = 0; i < USERS_PER_REQUEST; i++) {
                if (data[i] === undefined) {
                    return;
                }
                usersFoundSoFar += 1;
                usernames.push(data[i].username);
            }
        }
        return new Promise(async function (resolve, reject) {
            for (var i = 0, l = Math.ceil(totalUsers / USERS_PER_REQUEST); i < l; i++) {
                await getUsernamesWithOffset()
                    .then(addUsersToList)
                    .catch(errorHandler);
            }
            resolve(usernames);
        });
    }
    return new Promise(function (resolve, reject) {
        function processUser(user) {
            users.push(user);
        }
        wiki_js_1.default.getUsersList({
            offset: 0,
            limit: 0,
        }).then(async function (e) {
            totalUsers = e.listuserssearchuser.result_count;
            console.log('Expected wait: ' + (totalUsers * WAIT_PER_USER / 1000) + 's');
            const partialUsers = await getPartialUsers(await getAllUsernames());
            for (var i = 0, keys = Object.keys(partialUsers), l = keys.length; i < l; i++) {
                await createUserFromPartialUser(partialUsers[keys[i]])
                    .then(processUser)
                    .catch(errorHandler);
            }
            resolve(users);
        }).catch(errorHandler);
    });
}
class Page {
    constructor(name, content) {
        this.name = name;
        this.content = content;
    }
    getCopy() { return this.content; }
    areThereChanges(content) { return content !== this.content; }
    submitChanges(content) {
        if (this.areThereChanges(content)) {
            wiki_js_1.default.edit({
                title: this.name,
                text: content,
                summary: 'Automatic adding of new editors'
            }).then(function (data) {
                console.log(data);
            });
            return;
        }
        console.log('There were no changes to ' + this.name + '.');
    }
}
function createPageFromTitle(title) {
    return new Promise(function (resolve, reject) {
        wiki_js_1.default.getRaw(title)
            .then(function (data) {
            resolve(new Page(title, data));
        })
            .catch(errorHandler);
    });
}
;
class Medal {
    constructor(paramObject) {
        this._users = [];
        this.name = paramObject.name;
        this._minimumEdits = paramObject.minimumEdits || 0;
        this._minimumPosts = paramObject.minimumPosts || 0;
        this._requiredGroups = paramObject.requiredGroups || [];
        this._excludingGroups = paramObject.excludingGroups || ['blocked'];
        this.weight = paramObject.weight;
        this.type = paramObject.type;
    }
    addUser(user) {
        this._users.push(user);
    }
    meetsRequirements(user) {
        if (user.edits < this._minimumEdits) {
            return false;
        }
        if (user.posts < this._minimumPosts) {
            return false;
        }
        if (!array.containsAllEntriesOf(user.groups, this._requiredGroups)) {
            return false;
        }
        return true;
    }
    addIfMeetsRequirements(user) {
        if (array.containsOneEntryOf(user.groups, this._excludingGroups)) {
            return;
        }
        if (this.meetsRequirements(user)) {
            this.addUser(user);
            user.addMedal(this);
        }
    }
    get users() {
        return this._users.sort(function (x, y) {
            if (x.name < y.name) {
                return -1;
            }
            if (x.name > y.name) {
                return 1;
            }
            return 0;
        });
    }
}
class User {
    constructor(name, id, edits, posts, groups) {
        this.medals = [];
        this.name = name;
        this.id = id;
        this.edits = edits;
        this.posts = posts;
        this.groups = groups;
        console.log('New user was created: ' + name);
    }
    addMedal(medal) {
        this.medals.push(medal);
    }
    highestWeightMedalOfTypes(medalTypes) {
        const medalsOfType = this.medals
            .filter(medal => {
            for (const medalType of medalTypes) {
                if (medal.type === medalType) {
                    return true;
                }
            }
        });
        const highestWeightNumber = Math.max(...medalsOfType.map(medal => medal.weight));
        for (const medalType of medalsOfType) {
            if (highestWeightNumber === medalType.weight) {
                return medalType;
            }
        }
        return null;
    }
    hasMedal(medal) {
        for (const userMedal of this.medals) {
            if (userMedal.name === medal.name) {
                return true;
            }
        }
        return false;
    }
}
function createUserFromPartialUser(partialUser) {
    var userProperties = {
        ...partialUser
    };
    function parseNumber(edit) {
        if (typeof edit === 'number') {
            return edit;
        }
        return parseInt(edit);
    }
    return new Promise(function (resolve, reject) {
        function getEditsAndPosts() {
            var params = {
                controller: 'UserProfile',
                method: 'getUserData',
                format: 'json',
                userId: userProperties.id
            };
            wiki_js_1.default.wikiaApi({
                method: 'GET',
                responseType: 'json',
                params: {
                    ...params
                },
            })
                .then(function (response) {
                userProperties.edits = parseNumber(response.data.userData.localEdits);
                userProperties.posts = parseNumber(response.data.userData.posts);
                resolve(new User(userProperties.name, userProperties.id, userProperties.edits, userProperties.posts, userProperties.groups));
            })
                .catch(errorHandler);
        }
        getEditsAndPosts();
    });
}
const medals = [
    new Medal({
        name: 'Starting Badge',
        minimumEdits: 1,
        weight: 0,
        type: 'edit',
    }),
    new Medal({
        name: 'Rock Badge',
        minimumEdits: 50,
        weight: 1,
        type: 'edit',
    }),
    new Medal({
        name: 'Water Badge',
        minimumEdits: 100,
        weight: 2,
        type: 'edit',
    }),
    new Medal({
        name: 'Electric Badge',
        minimumEdits: 250,
        weight: 3,
        type: 'edit',
    }),
    new Medal({
        name: 'Plant Badge',
        minimumEdits: 500,
        weight: 4,
        type: 'edit',
    }),
    new Medal({
        name: 'Poison Badge',
        minimumEdits: 750,
        weight: 5,
        type: 'edit',
    }),
    new Medal({
        name: 'Insect Badge',
        minimumEdits: 1000,
        weight: 6,
        type: 'edit',
    }),
    new Medal({
        name: 'Combat Badge',
        minimumEdits: 1250,
        weight: 7,
        type: 'edit',
    }),
    new Medal({
        name: 'Fire Badge',
        minimumEdits: 1500,
        weight: 8,
        type: 'edit',
    }),
    new Medal({
        name: 'Ice Badge',
        minimumEdits: 2000,
        weight: 9,
        type: 'edit',
    }),
    new Medal({
        name: 'Spectrum Badge',
        minimumEdits: 3000,
        weight: 10,
        type: 'edit',
    }),
    new Medal({
        name: 'Dragon Badge',
        minimumEdits: 4000,
        weight: 11,
        type: 'edit',
    }),
    new Medal({
        name: 'Fairy Badge',
        minimumEdits: 5000,
        weight: 12,
        type: 'edit',
    }),
    new Medal({
        name: 'Forum User',
        minimumPosts: 100,
        weight: 0,
        type: 'post',
    }),
    new Medal({
        name: 'Forum Poster',
        minimumPosts: 1000,
        weight: 1,
        type: 'post',
    }),
    new Medal({
        name: 'Forum Machine',
        minimumPosts: 5000,
        weight: 2,
        type: 'post',
    }),
    new Medal({
        name: 'Blocked Badge',
        requiredGroups: ['blocked'],
        excludingGroups: [],
        weight: 100,
        type: 'role',
    }),
];
function syncMedalsPageWithScript(users) {
    const sortedUsers = users.sort(function (x, y) {
        if (x.name < y.name)
            return -1;
        if (x.name > y.name)
            return 1;
        return 0;
    });
    createPageFromTitle('Project:Medals')
        .then(medalsPage => {
        var medalsJSON = medalsPage.getCopy();
        medalsJSON.dataUser = {};
        for (var user of sortedUsers) {
            if (user.medals.length > 0) {
                medalsJSON.dataUser[user.name] = user.medals.map(medal => medal.name);
            }
        }
        medalsPage.submitChanges(JSON.stringify(medalsJSON));
    })
        .catch(errorHandler);
}
function syncMedalsListPageWithScript() {
    createPageFromTitle('Project:Medals').then(medalsPage => {
        var medalsJSON = medalsPage.getCopy();
        createPageFromTitle('Project:Medals List/template')
            .then(medalsListTemplate => {
            var content = medalsListTemplate.getCopy();
            for (const medal of medals) {
                const medalDescription = medalsJSON.dataMedal[medal.name].title;
                const medalUsers = medal.users
                    .filter(user => user.highestWeightMedalOfTypes([medal.type])?.name === medal.name)
                    .map(user => `[[User:${user.name}|${user.name}]]`).join('|');
                content = content.replace(new RegExp(`\\[${medal.name} Title]`, 'g'), medalDescription);
                content = content.replace(new RegExp(`\\[${medal.name}]`, 'g'), medalUsers === '' ? 'N/A' : `{{#invoke:String|join|${medalUsers}}}`);
            }
            new Page('Project:Medals List', '').submitChanges(content);
        })
            .catch(errorHandler);
    })
        .catch(errorHandler);
}
function addUsersToCSS() {
    function startFormat(medalName) {
        return '/* ' + medalName + ' */';
    }
    function endFormat(medalName) {
        return '/* END ' + medalName + ' */';
    }
    function ruleFormat(name) {
        return `:not(.wds-avatar) > [href$="User:${encodeURIComponent(name.replace(/ /g, '_'))}"]:not(.image)::after`;
    }
    createPageFromTitle('MediaWiki:Common.css').then(CommonCSS => {
        const PLACEHOLDER_NAME = '!';
        var content = CommonCSS.getCopy();
        function addRulesToMedalCSS(medalName, rules) {
            const startIndex = content.indexOf(startFormat(medalName)) + startFormat(medalName).length + 1;
            const endingIndex = content.indexOf(endFormat(medalName)) - 1;
            content = content.substring(0, startIndex) + rules + content.substring(endingIndex);
        }
        for (const medal of medals) {
            const rules = [];
            if (content.indexOf(startFormat(medal.name)) > -1) {
                medal.users.forEach(user => {
                    const highestCSSMedal = user.highestWeightMedalOfTypes(['edit', 'role']);
                    if (highestCSSMedal === null || highestCSSMedal.weight === 0) {
                        return;
                    }
                    if (highestCSSMedal.name === medal.name) {
                        rules.push(ruleFormat(user.name));
                    }
                });
                if (rules.length === 0) {
                    rules.push(ruleFormat(PLACEHOLDER_NAME));
                }
                addRulesToMedalCSS(medal.name, rules.join(',\n'));
            }
        }
        CommonCSS.submitChanges(content);
    })
        .catch(errorHandler);
}
wiki_js_1.default.login('<name>');
getAllLocalUsers().then(users => {
    users.forEach(user => {
        medals.forEach(medal => {
            medal.addIfMeetsRequirements(user);
        });
    });
    syncMedalsPageWithScript(users);
    syncMedalsListPageWithScript();
    addUsersToCSS();
})
    .catch(errorHandler);
