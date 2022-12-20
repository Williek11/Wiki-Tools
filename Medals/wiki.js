"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const jimp_1 = __importDefault(require("jimp"));
const fs_1 = __importDefault(require("fs"));
const promises_1 = __importDefault(require("fs/promises"));
const form_data_1 = __importDefault(require("form-data"));
const prompt = require('prompt-sync')();
function errorHandler(err) {
    console.error(err);
}
var namespaces;
(function (namespaces) {
    namespaces[namespaces["Media"] = -2] = "Media";
    namespaces[namespaces["Special"] = -1] = "Special";
    namespaces[namespaces["Main"] = 0] = "Main";
    namespaces[namespaces["Talk"] = 1] = "Talk";
    namespaces[namespaces["User"] = 2] = "User";
    namespaces[namespaces["User talk"] = 3] = "User talk";
    namespaces[namespaces["Project"] = 4] = "Project";
    namespaces[namespaces["Project talk"] = 5] = "Project talk";
    namespaces[namespaces["File"] = 6] = "File";
    namespaces[namespaces["File talk"] = 7] = "File talk";
    namespaces[namespaces["MediaWiki"] = 8] = "MediaWiki";
    namespaces[namespaces["MediaWiki talk"] = 9] = "MediaWiki talk";
    namespaces[namespaces["Template"] = 10] = "Template";
    namespaces[namespaces["Template talk"] = 11] = "Template talk";
    namespaces[namespaces["Help"] = 12] = "Help";
    namespaces[namespaces["Help talk"] = 13] = "Help talk";
    namespaces[namespaces["Category"] = 14] = "Category";
    namespaces[namespaces["Category talk"] = 15] = "Category talk";
    namespaces[namespaces["Forum"] = 110] = "Forum";
    namespaces[namespaces["Forum talk"] = 111] = "Forum talk";
    namespaces[namespaces["Module"] = 828] = "Module";
    namespaces[namespaces["Module talk"] = 829] = "Module talk";
})(namespaces || (namespaces = {}));
function getFirstValueOfObject(obj) {
    return obj[Object.keys(obj)[0]];
}
class WikiPostEvent {
    constructor(name, params) {
        this.name = name;
        this.params = params;
        this.postCallbacks = [];
    }
    onPost(callback) {
        this.postCallbacks.push(callback);
    }
    canBePosted() {
        return wiki.loggedIn;
    }
    postEvent() {
        const resultPromise = wiki['_' + this.name](this.params);
        resultPromise.then((result) => {
            for (const callback of this.postCallbacks) {
                callback(result);
            }
        });
    }
}
// PLEASE replace this with your message wall! Thank you :)
const headers = {
    'User-Agent': 'axios/0.19.0 - https://community.fandom.com/wiki/Message_Wall:Williek11',
};
const wiki = {
    api: axios_1.default.create({
        baseURL: 'https://tamingio.fandom.com/api.php',
        withCredentials: true,
        headers,
    }),
    wikiaApi: axios_1.default.create({
        baseURL: 'https://tamingio.fandom.com/wikia.php',
        headers,
    }),
    pathApi: axios_1.default.create({
        baseURL: 'https://tamingio.fandom.com/wiki/',
        withCredentials: true,
        headers,
    }),
    cookies: {
        list: '',
        set(cookies_arr) {
            wiki.cookies.list = cookies_arr.join(';');
            //@ts-ignore
            wiki.api.defaults.headers.Cookie = cookies_arr.join(';');
            //@ts-ignore
            wiki.pathApi.defaults.headers.Cookie = cookies_arr.join(';');
        }
    },
    url: 'https://tamingio.fandom.com/',
    wikiPath: 'https://tamingio.fandom.com/wiki/',
    loggedIn: false,
    get(params, logString) {
        if (logString) {
            const arr = [];
            for (const str of Object.keys(params)) {
                arr.push(str + '=' + params[str]);
            }
            console.log(`${wiki.url}api.php?${arr.join('&')}`);
        }
        return wiki.api({
            method: 'GET',
            responseType: 'json',
            params: {
                ...params,
                format: 'json'
            }
        });
    },
    waitlist: {
        list: [],
        addEvent(wikiEvent) {
            return new Promise(function (resolve, reject) {
                wiki.waitlist.writeEventIntoLogs(wikiEvent);
                if (wikiEvent.canBePosted()) {
                    wikiEvent.postEvent();
                }
                else {
                    wiki.waitlist.list.push(wikiEvent);
                }
                resolve();
            });
        },
        writeEventIntoLogs(wikiEvent) {
            return new Promise(async function (resolve, reject) {
                await promises_1.default.appendFile('./botLogs.txt', 'Started ' + wikiEvent.name + ' - ' + new Date().toString() + '\n');
                wikiEvent.onPost(function (result) {
                    promises_1.default.appendFile('./botLogs.txt', 'Finished ' + wikiEvent.name + ' - ' + new Date().toString() + '\n');
                });
                resolve();
            });
        },
        postEvents() {
            return new Promise(function (resolve, reject) {
                for (const wikiEvent of wiki.waitlist.list) {
                    if (wikiEvent.canBePosted()) {
                        wikiEvent.postEvent();
                    }
                    else {
                        wiki.waitlist.list.push(wikiEvent);
                    }
                }
                resolve();
            });
        },
    },
    post(params, config) {
        return wiki.api({
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                ...headers,
            },
            data: new URLSearchParams(params).toString(),
            ...config,
        });
    },
    getToken(type) {
        return new Promise(function (resolve, reject) {
            const token_params = {
                action: 'query',
                meta: 'tokens',
                type: type,
                format: 'json'
            };
            wiki.get(token_params)
                .then(function (response) {
                resolve(response);
            })
                .catch(function (err) {
                console.error('\n-------- GET TOKEN ERROR --------\n' +
                    err +
                    '\n-------- GET TOKEN ERROR --------\n');
                reject(err);
            });
        });
    },
    getRaw(page_name) {
        return new Promise(function (resolve, reject) {
            axios_1.default.get(encodeURI(wiki.wikiPath + page_name), {
                headers,
                params: { action: 'raw' }
            })
                .then(function (response) {
                if (typeof response.data == 'number' ||
                    typeof response.data == 'boolean') {
                    resolve('' + response.data);
                }
                resolve(response.data);
            })
                .catch(function (err) {
                resolve('ERROR');
            });
        });
    },
    getUsersList(params) {
        return new Promise(function (resolve, reject) {
            wiki.get({
                action: 'listuserssearchuser',
                format: 'json',
                groups: 'all',
                contributed: 0,
                // `edits` may repeat the same
                // users over and over again,
                // since it's bad at sorting.
                // `ts_edit` (presumably) means
                // "timestamp_edit", and sorts
                // users by whom last edited,
                // and this is very hard to
                // repeat.
                order: 'ts_edit',
                sort: 'desc',
                ...params,
            })
                .then(function (response) {
                resolve(response.data);
            });
        });
    },
    getSearchResults(query) {
        return new Promise(function (resolve, reject) {
            wiki.get({
                action: 'query',
                list: 'search',
                srsearch: query,
                srprop: '',
                srlimit: 5000,
                format: 'json',
            })
                .then(function (response) {
                resolve(response.data.query.search);
            })
                .catch(function (err) {
                reject(err);
            });
        });
    },
    getCategoryMembers(category) {
        function readyCategoryName() {
            if (!category.includes('Category:')) {
                return 'Category:' + category;
            }
            return category;
        }
        return new Promise(function (resolve, reject) {
            const categoryFiltered = readyCategoryName();
            wiki.get({
                action: 'query',
                list: 'categorymembers',
                cmtitle: categoryFiltered,
                cmprop: 'title',
                cmlimit: 5000,
                format: 'json',
            })
                .then(function (response) {
                resolve(response.data.query.categorymembers);
            })
                .catch(function (err) {
                reject(err);
            });
        });
    },
    getWhatLinksHere(page_to_get_transclusions_of) {
        return new Promise(function (resolve, reject) {
            wiki.get({
                action: 'query',
                prop: 'linkshere',
                titles: page_to_get_transclusions_of,
                format: 'json',
            })
                .then(function (response) {
                resolve(response.data.query);
            })
                .catch(function (err) {
                reject(err);
            });
        });
    },
    getWhatEmbbedHere(page_to_get_transclusions_of) {
        return new Promise(function (resolve, reject) {
            wiki.get({
                action: 'query',
                list: 'embeddedin',
                eititle: page_to_get_transclusions_of,
                eilimit: 5000,
                format: 'json',
            })
                .then(function (response) {
                resolve(response.data.query.embeddedin);
            })
                .catch(function (err) {
                reject(err);
            });
        });
    },
    getWhatUsesThisFile(page_to_get_transclusions_of) {
        return new Promise(function (resolve, reject) {
            wiki.get({
                action: 'query',
                prop: 'fileusage',
                titles: page_to_get_transclusions_of,
                fulimit: 5000,
                format: 'json',
            })
                .then(function (response) {
                resolve(response.data.query);
            })
                .catch(function (err) {
                reject(err);
            });
        });
    },
    getAllPages(params) {
        return new Promise(function (resolve, reject) {
            wiki.get({
                action: 'query',
                list: 'allpages',
                apnamespace: params.namespaceId,
                apprefix: params.prefix || '',
                aplimit: 5000,
                apfrom: params.startFrom || '',
                format: 'json',
            })
                .then(function (response) {
                resolve(response.data.query);
            })
                .catch(function (err) {
                reject(err);
            });
        });
    },
    login(name) {
        return new Promise(async function (resolve, reject) {
            const credentials = (await promises_1.default.readFile('./Credentials.txt'))
                .toString();
            function findPassword(name) {
                for (var i = 0, lines = credentials.split('\n'); i < lines.length; i++) {
                    if (lines[i].includes(name)) {
                        return (lines[i + 1].replace('Password: ', '')).trim();
                    }
                }
                throw new Error('Name ' + name + ' does not contain a password.');
            }
            // step 1
            wiki.getToken('login').then(login);
            // step 2
            function login(response) {
                const login_params = {
                    action: 'login',
                    lgname: name,
                    lgpassword: findPassword(name),
                    lgtoken: response.data.query.tokens.logintoken,
                    format: 'json',
                };
                wiki.cookies.set(response.headers['set-cookie']);
                wiki.post(login_params)
                    .then(function (response) {
                    console.log('The password passed in is ' + findPassword(name));
                    if (response.data.login.result === 'Failed') {
                        throw new Error('Login has failed because "' + response.data.login.result + '"');
                    }
                    if (response.headers['set-cookie']) {
                        wiki.cookies.set(response.headers['set-cookie']);
                    }
                    wiki.loggedIn = true;
                    wiki.waitlist.postEvents();
                    resolve(response.data);
                })
                    .catch(function (error) {
                    reject(error);
                });
            }
            ;
        });
    },
    logout() {
        return new Promise(function (resolve, reject) {
            // step 1
            wiki.getToken('csrf').then(logout);
            // step 2
            function logout(response) {
                const login_params = {
                    action: 'logout',
                    token: response.data.query.tokens.csrftoken,
                    format: 'json',
                };
                wiki.cookies.set(response.headers['set-cookie']);
                wiki.post(login_params)
                    .then(function (response) {
                    wiki.loggedIn = false;
                    resolve(response.data);
                })
                    .catch(function (error) {
                    reject(error);
                });
            }
            ;
        });
    },
    exists(page_name) {
        return new Promise(function (resolve, reject) {
            axios_1.default.get(encodeURI(wiki.wikiPath + page_name), {
                params: { action: 'raw' }
            })
                .then(function () {
                resolve(true);
            })
                .catch(function (err) {
                resolve(false);
            });
        });
    },
    edit(params) {
        return new Promise(async function (resolve, reject) {
            const postEvent = new WikiPostEvent('edit', params);
            postEvent.onPost((result) => resolve(result));
            wiki.waitlist.addEvent(postEvent);
        });
    },
    _edit(params) {
        return new Promise(async function (resolve, reject) {
            if (!(params.text || params.prependtext || params.appendtext)) {
                throw new Error(`When editing ${params.title || params.pageid}, no form of text could be found. As such, it is believed that this action was a mistake.`);
            }
            wiki.getToken('csrf').then(edit);
            function edit(response) {
                const edit_params = {
                    action: 'edit',
                    token: response.data.query.tokens.csrftoken,
                    bot: true,
                    format: 'json',
                    summary: 'Automated edit.',
                    ...params,
                };
                wiki.post(edit_params)
                    .then(function (response) {
                    if (response.data.error) {
                        console.error((response.data.error));
                        reject(response.data);
                    }
                    resolve(response.data);
                })
                    .catch(function (err) {
                    console.error(err);
                    reject(response.data);
                });
            }
        });
    },
    changeLinks(params) {
        return new Promise(async function (resolve, reject) {
            const postEvent = new WikiPostEvent('changeLinks', params);
            postEvent.onPost(() => resolve());
            wiki.waitlist.addEvent(postEvent);
        });
    },
    _changeLinks(params) {
        return new Promise(async function (resolve, reject) {
            const whatLinksHere = getFirstValueOfObject((await wiki.getWhatLinksHere(params.from)).pages).linkshere || [];
            const whatEmbeddedHere = (await wiki.getWhatEmbbedHere(params.from)) || [];
            const whatUsedThisFile = getFirstValueOfObject((await wiki.getWhatUsesThisFile(params.from)).pages).fileusage || [];
            for (var i = 0; i < whatLinksHere.length; i++) {
                const title = whatLinksHere[i];
                const linkRegExp = new RegExp(`\\[\\[${params.from}[\\w\\s\\d|]*]]`, 'gi');
                var wikitext = await wiki.getRaw(title.title);
                wikitext = wikitext.replace(linkRegExp, function (link) {
                    const hyperLink = new HyperLink(link);
                    hyperLink.linkText = params.to;
                    console.log('From ' + link + ' to ' + hyperLink.wikitext);
                    return hyperLink.wikitext;
                });
                await wiki.edit({
                    title: title.title,
                    text: wikitext,
                    summary: `Changing links from ${params.from} to ${params.to}`,
                }).then(_ => console.log(title.title + ' has been successfully edited.'));
                await sleep(1000);
            }
            for (var i = 0; i < whatEmbeddedHere.length; i++) {
                const title = whatEmbeddedHere[i];
                var wikitext = await wiki.getRaw(title.title);
                wikitext = wikitext.replace(new RegExp(`{{:?${params.from}\\|[\\w\\s\\d-]*}}`, 'gi'), function (embbed) {
                    return embbed.replace(params.from, params.to);
                });
                await wiki.edit({
                    title: title.title,
                    text: wikitext,
                    summary: `Changing links from ${params.from} to ${params.to}`,
                }).then(_ => console.log(title.title + ' has been successfully edited.'));
                await sleep(1000);
            }
            for (var i = 0; i < whatUsedThisFile.length; i++) {
                const title = whatUsedThisFile[i];
                var wikitext = await wiki.getRaw(title.title);
                wikitext = wikitext.replace(new RegExp(params.from, 'gi'), params.to);
                await wiki.edit({
                    title: title.title,
                    text: wikitext,
                    summary: `Changing links from ${params.from} to ${params.to}`,
                }).then(_ => console.log(title.title + ' has been successfully edited.'));
                await sleep(1000);
            }
            resolve();
        });
    },
    delete(params) {
        return new Promise(async function (resolve, reject) {
            const postEvent = new WikiPostEvent('delete', params);
            postEvent.onPost(() => resolve());
            wiki.waitlist.addEvent(postEvent);
        });
    },
    _delete(params) {
        return new Promise(async function (resolve, reject) {
            wiki.getToken('csrf').then(requestTheDeletion);
            function requestTheDeletion(response) {
                const deletion_params = {
                    action: 'delete',
                    token: response.data.query.tokens.csrftoken,
                    // bot is unrecognized
                    format: 'json',
                    ...params,
                };
                wiki.post(deletion_params)
                    .then(function (response) {
                    resolve(response.data);
                })
                    .catch(function (err) {
                    console.error(err);
                });
            }
        });
    },
    move(params) {
        return new Promise(async function (resolve, reject) {
            const postEvent = new WikiPostEvent('move', params);
            postEvent.onPost(response => resolve(response));
            wiki.waitlist.addEvent(postEvent);
        });
    },
    _move(params) {
        return new Promise(function (resolve, reject) {
            // step 1
            wiki.getToken('csrf').then(requestTheMove);
            // step 2
            function requestTheMove(response) {
                const edit_params = {
                    action: 'move',
                    token: response.data.query.tokens.csrftoken,
                    // bot is unrecognized
                    ...params,
                    format: 'json',
                };
                wiki.post(edit_params)
                    .then(function (response) {
                    resolve(response.data);
                })
                    .catch(function (err) {
                    console.error(err);
                });
            }
        });
    },
    uploadImage(params) {
        return new Promise(async function (resolve, reject) {
            const postEvent = new WikiPostEvent('uploadImage', params);
            postEvent.onPost(result => resolve(result));
            wiki.waitlist.addEvent(postEvent);
        });
    },
    _uploadImage(params) {
        return new Promise(async function (resolve, reject) {
            // step 1
            const token = await wiki.getToken('csrf');
            // step 2
            if (params.url) {
                axios_1.default.head(params.url)
                    .then(_ => {
                    jimp_1.default.read(params.url)
                        .then(parseImage)
                        .catch(errorHandler);
                })
                    .catch(_ => {
                    console.error('This URL - ' + params.url + ' - doesn\'t exist, my guy.');
                    resolve('');
                });
            }
            if (params.wikiUrl) {
                const response = await wiki.pathApi('Special:Redirect/file/' + params.wikiUrl.replace('File:', ''));
                jimp_1.default.read(response.request.res.responseUrl)
                    .then(parseImage)
                    .catch(errorHandler);
            }
            if (params.localUrl) {
                const response = await promises_1.default.readFile(params.localUrl);
                jimp_1.default.read(response)
                    .then(parseImage)
                    .catch(errorHandler);
            }
            // step 3
            async function parseImage(image) {
                if (params.rotate) {
                    image = image.rotate(params.rotate);
                }
                if (params.trim) {
                    const blankCanvas = await jimp_1.default.create(image.getWidth() + 2, image.getHeight() + 2);
                    image = blankCanvas
                        .clone()
                        .blit(image, 1, 1)
                        .autocrop();
                }
                storeImage(image);
            }
            // step 4
            async function storeImage(image) {
                image
                    .writeAsync('./images/Storage.png')
                    .then(function () {
                    uploadImage();
                })
                    .catch(errorHandler);
            }
            // step 5
            async function uploadImage() {
                const stream = fs_1.default.createReadStream('./images/Storage.png');
                const form = new form_data_1.default();
                form.append('action', 'upload');
                form.append('filename', params.fileDestination);
                form.append('ignorewarnings', '1');
                form.append('token', token.data.query.tokens.csrftoken);
                form.append('format', 'json');
                if (params.text) {
                    form.append('text', params.text);
                }
                if (params.comment) {
                    form.append('comment', params.comment);
                }
                form.append('file', stream);
                form.getLength(function (err, length) {
                    if (params.debugOnly) {
                        resolve('Terminated proccess with success.');
                        return;
                    }
                    axios_1.default.post('https://tamingio.fandom.com/api.php', form, {
                        headers: {
                            'Content-Length': length,
                            'Content-Disposition': 'form-data',
                            Cookie: wiki.cookies.list,
                        },
                    })
                        .then(response => resolve(response.data))
                        .catch(errorHandler);
                });
            }
        });
    }
};
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
class HyperLink {
    constructor(linkString) {
        this.visualTextWithBarRegexp = /(?<=\[\[.*\|).*(?=]])/;
        this.linkTextWithBarRegexp = /(?<=\[\[).*(?=\|.*]])/;
        this.noBarRegexp = /(?<=\[\[).*(?=]])/;
        if (!linkString.includes('|')) {
            if (linkString.match(this.noBarRegexp) == null) {
                throw new Error('');
            }
            // @ts-ignore
            this.linkText = linkString.match(this.noBarRegexp)[0];
            // @ts-ignore
            this.visualText = linkString.match(this.noBarRegexp)[0];
            return;
        }
        if (!linkString.match(this.linkTextWithBarRegexp)) {
            throw new Error('');
        }
        if (!linkString.match(this.visualTextWithBarRegexp)) {
            throw new Error('');
        }
        // @ts-ignore
        this.linkText = linkString.match(this.linkTextWithBarRegexp)[0];
        // @ts-ignore
        this.visualText = linkString.match(this.visualTextWithBarRegexp)[0];
    }
    get wikitext() {
        if (this.linkText == this.visualText) {
            return '[[' + this.linkText + ']]';
        }
        return '[[' + this.linkText + '|' + this.visualText + ']]';
    }
}
exports.default = wiki;
