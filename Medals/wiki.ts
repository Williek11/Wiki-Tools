import axios, { AxiosResponse } from 'axios';
import Jimp from 'jimp';
import fs from 'fs';
import fsPromises from 'fs/promises';
import FormData from 'form-data';

const prompt = require('prompt-sync')();

function errorHandler (err) {
	console.error(err);
}

type LooseObject = {
	[key: string]: any
}

type pageId = number;

type pageResponse = {
	ns: number,
	title: string,
	pageid: pageId,
};

type tokensResponse = {
	tokens: {
		createaccounttoken?: string,
		csrftoken?: string,
		logintoken?: string,
		patroltoken?: string,
		rollbacktoken?: string,
		userrightstoken?: string,
		watchtoken?: string,
	}
}

type searchResponse = {
	search: pageResponse[]
};

type userListResponse = {
	listuserssearchuser: {
		result_count: number,
		[key: number]: {
			user_id: string,
			username: string,
			groups: string[],
			edit_count: string | number
		}
	}
};

type categoryMembersResponse = {
	categorymembers: pageResponse[]
};

type embeddedInResponse = {
	embeddedin: pageResponse[]
};

type allPagesResponse = {
	allpages: pageResponse[]
};

type whatLinksAndUsesThisPageResponse = {
	pages: {
		[key: pageId]: {
			ns: number,
			title: string,
			id: pageId,
			linkshere: pageResponse[]
		}
	}
};

type whatUsesThisFileResponse = {
	pages: {
		[key: pageId]: {
			ns: number,
			title: string,
			id: pageId,
			fileusage: pageResponse[]
		}
	}
};

type queryResponse<T> = {
	batchcomplete: string,
	query: T
};

type editResponse = {
	warnings?: unknown,
	edit?: {
		result: 'Success',
		pageid: number,
		title: string,
		contentmodel: string,
		oldrevid: number,
		newrevid: number,
		newtimestamp: string,
		watched: string,
		nochange?: '',
	},
	error?: {
		code: string,
		info: string,
		'*': string,
	}
};

type moveResponse = {
	warnings?: unknown,
	move?: {
		from: string,
		to: string,
		reason: string,
		redirectcreated: string,
		moveoverredirect: string,
	},
	error?: {
		code: string,
		info: string,
		'*': string,
	}
};

type deleteResponse = {
	warnings?: unknown,
	delete?: {
		title: string,
		reason: string,
		logid: number,
	},
	error?: {
		code: string,
		info: string,
		'*': string,
	}
};

type ApiToken = 'createaccount' | 'csrf' | 'login' | 'patrol' | 'rollback' | 'userrights' | 'watch';
type watchlistOptions = 'nochange' | 'preferences' | 'unwatch' | 'watch';

enum namespaces {
	'Media' = -2,
	'Special',
	'Main',
	'Talk',
	'User',
	'User talk',
	'Project',
	'Project talk',
	'File',
	'File talk',
	'MediaWiki',
	'MediaWiki talk',
	'Template',
	'Template talk',
	'Help',
	'Help talk',
	'Category',
	'Category talk',
	'Forum' = 110,
	'Forum talk' = 111,
	'Module' = 828,
	'Module talk' = 829,
}

type typedObject<T> = {
	[key: string | number]: T
}

function getFirstValueOfObject <T> (obj: typedObject<T>): T {
	return obj[Object.keys(obj)[0]]
}

class WikiPostEvent {
	name: string;
	params: LooseObject;
	postCallbacks: Function[]

	constructor (name: string, params: LooseObject) {
		this.name = name;
		this.params = params;
		this.postCallbacks = [];
	}

	onPost (callback: Function) {
		this.postCallbacks.push(callback);
	}

	canBePosted () {
		return wiki.loggedIn;
	}

	postEvent () {
		const resultPromise = wiki['_'+this.name](this.params);
		resultPromise.then((result: any) => {
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
	api: axios.create({
		baseURL: 'https://tamingio.fandom.com/api.php',
		withCredentials: true,
		headers,
	}),
	wikiaApi: axios.create({
		baseURL: 'https://tamingio.fandom.com/wikia.php',
		headers,
	}),
	pathApi: axios.create({
		baseURL: 'https://tamingio.fandom.com/wiki/',
		withCredentials: true,
		headers,
	}),
	cookies: {
		list: '',
		set (cookies_arr: string[]) {
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
	get (params: LooseObject, logString?: boolean) {
		if (logString) {
			const arr = [] as string[];
			for (const str of Object.keys(params)) {
				arr.push(str+'='+params[str])
			}
			console.log(`${wiki.url}api.php?${arr.join('&')}`)
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
		list: [] as WikiPostEvent[],
		addEvent (wikiEvent: WikiPostEvent) {
			return new Promise<void>(function (resolve, reject) {
				wiki.waitlist.writeEventIntoLogs(wikiEvent);

				if (wikiEvent.canBePosted()) {
					wikiEvent.postEvent();
				} else {
					wiki.waitlist.list.push(wikiEvent);
				}

				resolve();
			})
		},
		writeEventIntoLogs (wikiEvent: WikiPostEvent) {
			return new Promise<void>(async function (resolve, reject) {
				await fsPromises.appendFile(
					'./botLogs.txt',
					'Started ' + wikiEvent.name + ' - ' + new Date().toString() + '\n'
				);
				wikiEvent.onPost(function (result) {
					fsPromises.appendFile(
						'./botLogs.txt',
						'Finished ' + wikiEvent.name + ' - ' + new Date().toString() + '\n'
					)
				})
				resolve();
			})
		},
		postEvents () {
			return new Promise<void>(function (resolve, reject) {
				for (const wikiEvent of wiki.waitlist.list) {
					if (wikiEvent.canBePosted()) {
						wikiEvent.postEvent();
					} else {
						wiki.waitlist.list.push(wikiEvent);
					}
				}
				resolve();
			})
		},
	},
	post (params: LooseObject, config?: LooseObject) {
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
	getToken (type: ApiToken): Promise<AxiosResponse<queryResponse<tokensResponse>>> {
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
					console.error(
						'\n-------- GET TOKEN ERROR --------\n' +
						err +
						'\n-------- GET TOKEN ERROR --------\n'
					);
					reject(err)
				});
		})
	},
	getRaw (page_name: string): Promise<string> {
		return new Promise(function (resolve, reject) {
			axios.get(encodeURI(wiki.wikiPath + page_name), {
				headers,
				params: { action: 'raw' }
			})
				.then(function (response) {
					if (
						typeof response.data == 'number' ||
						typeof response.data == 'boolean'
					) {
						resolve(''+response.data)
					}
					resolve(response.data);
				})
				.catch(function (err) {
					resolve('ERROR');
				})
		})
	},
	getUsersList (params: {
		limit: number | 100,
		offset: number,
		[key: string]: any,
	}): Promise<userListResponse> {
		return new Promise(function(resolve, reject) {
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
				.then(function (response: AxiosResponse<userListResponse>) {
					resolve(response.data);
				})
		})
	},
	getSearchResults (query: string): Promise<pageResponse[]> {
		return new Promise(function (resolve, reject) {
			wiki.get({
				action: 'query',
				list: 'search',
				srsearch: query,
				srprop: '',
				srlimit: 5000,
				format: 'json',
			})
				.then(function (response: AxiosResponse<queryResponse<searchResponse>>) {
					resolve(response.data.query.search);
				})
				.catch(function (err) {
					reject(err);
				})
		})
	},
	getCategoryMembers (category: string): Promise<pageResponse[]> {
		function readyCategoryName() {
			if (!category.includes('Category:')) {
				return 'Category:' + category
			}
			return category
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
				.then(function (response: AxiosResponse<queryResponse<categoryMembersResponse>>) {
					resolve(response.data.query.categorymembers);
				})
				.catch(function (err) {
					reject(err);
				})
		})
	},
	getWhatLinksHere (page_to_get_transclusions_of: string): Promise<whatLinksAndUsesThisPageResponse> {
		return new Promise(function (resolve, reject) {
			wiki.get({
				action: 'query',
				prop: 'linkshere',
				titles: page_to_get_transclusions_of,
				format: 'json',
			})
				.then(function (response: AxiosResponse<queryResponse<whatLinksAndUsesThisPageResponse>>) {
					resolve(response.data.query);
				})
				.catch(function (err) {
					reject(err);
				})
		})
	},
	getWhatEmbbedHere (page_to_get_transclusions_of: string): Promise<pageResponse[]> {
		return new Promise(function (resolve, reject) {
			wiki.get({
				action: 'query',
				list: 'embeddedin',
				eititle: page_to_get_transclusions_of,
				eilimit: 5000,
				format: 'json',
			})
				.then(function (response: AxiosResponse<queryResponse<embeddedInResponse>>) {
					resolve(response.data.query.embeddedin);
				})
				.catch(function (err) {
					reject(err);
				})
		})
	},
	getWhatUsesThisFile (page_to_get_transclusions_of: string): Promise<whatUsesThisFileResponse> {
		return new Promise(function (resolve, reject) {
			wiki.get({
				action: 'query',
				prop: 'fileusage',
				titles: page_to_get_transclusions_of,
				fulimit: 5000,
				format: 'json',
			})
				.then(function (response: AxiosResponse<queryResponse<whatUsesThisFileResponse>>) {
					resolve(response.data.query);
				})
				.catch(function (err) {
					reject(err);
				})
		})
	},
	getAllPages (params: {
		namespaceId: number,
		prefix?: string,
		startFrom?: string,
	}): Promise<allPagesResponse> {
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
				.then(function (response: AxiosResponse<queryResponse<allPagesResponse>>) {
					resolve(response.data.query);
				})
				.catch(function (err) {
					reject(err);
				})
		})
	},
	login (name: string) {
		return new Promise(async function (resolve, reject) {
			const credentials = (await fsPromises.readFile('./Credentials.txt'))
				.toString();

			function findPassword (name: string): string {
				for (var i = 0, lines = credentials.split('\n'); i < lines.length; i++) {
					if (lines[i].includes(name)) {
						return (lines[i+1].replace('Password: ', '')).trim()
					}
				}
				throw new Error('Name '+name+' does not contain a password.')
			}

			// step 1
			wiki.getToken('login').then(login);

			// step 2
			function login(response: any) {
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
						console.log('The password passed in is '+findPassword(name));
						if (response.data.login.result === 'Failed') {
							throw new Error('Login has failed because "'+response.data.login.result+'"')
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
			};
		});
	},
	logout () {
		return new Promise(function (resolve, reject) {
			// step 1
			wiki.getToken('csrf').then(logout);

			// step 2
			function logout(response: any) {
				const login_params = {
					action: 'logout',
					token: response.data.query.tokens.csrftoken,
					format: 'json',
				}

				wiki.cookies.set(response.headers['set-cookie']);
				wiki.post(login_params)
					.then(function (response) {
						wiki.loggedIn = false;
						resolve(response.data);
					})
					.catch(function (error) {
						reject(error);
					});
			};
		});
	},
	exists (page_name: string): Promise<boolean> {
		return new Promise(function (resolve, reject) {
			axios.get(encodeURI(wiki.wikiPath + page_name), {
				params: { action: 'raw' }
			})
				.then(function () {
					resolve(true);
				})
				.catch(function (err) {
					resolve(false);
				})
		})
	},
	edit (params: {
		title?: string,
		pageid?: pageId,
		prependtext?: string,
		text?: string,
		appendtext?: string,
		summary?: string,
		createonly?: boolean,
		nocreate?: boolean,
		tags?: string,
		watchlist?: watchlistOptions,
	}): Promise<editResponse> {
		return new Promise(async function (resolve, reject) {
			const postEvent = new WikiPostEvent('edit', params);
			postEvent.onPost((result) => resolve(result))
			wiki.waitlist.addEvent(postEvent);
		})
	},
	_edit (params: LooseObject): Promise<editResponse> {
		return new Promise(async function (resolve, reject) {
			if (!(params.text || params.prependtext || params.appendtext)) {
				throw new Error(`When editing ${params.title || params.pageid}, no form of text could be found. As such, it is believed that this action was a mistake.`)
			}

			wiki.getToken('csrf').then(edit);

			function edit(response: any) {
				const edit_params = {
					action: 'edit',
					token: response.data.query.tokens.csrftoken,
					bot: true,
					format: 'json',
					summary: 'Automated edit.',
					...params,
				}

				wiki.post(edit_params)
					.then(function (response: AxiosResponse<editResponse>) {
						if (response.data.error) {
							console.error((response.data.error))
							reject(response.data)
						}
						resolve(response.data)
					})
					.catch(function (err) {
						console.error(err)
						reject(response.data)
					})
			}
		})
	},
	changeLinks (params: {
		from: string,
		to: string,
	}) {
		return new Promise<void>(async function (resolve, reject) {
			const postEvent = new WikiPostEvent('changeLinks', params);
			postEvent.onPost(() => resolve());
			wiki.waitlist.addEvent(postEvent);
		})
	},
	_changeLinks (params: LooseObject) {
		return new Promise<void>(async function (resolve, reject) {
			const whatLinksHere = getFirstValueOfObject((await wiki.getWhatLinksHere(params.from)).pages).linkshere || []
			const whatEmbeddedHere = (await wiki.getWhatEmbbedHere(params.from)) || []
			const whatUsedThisFile = getFirstValueOfObject((await wiki.getWhatUsesThisFile(params.from)).pages).fileusage || []

			for (var i = 0; i < whatLinksHere.length; i++) {
				const title = whatLinksHere[i]
				const linkRegExp = new RegExp(`\\[\\[${params.from}[\\w\\s\\d|]*]]`, 'gi')
				var wikitext = await wiki.getRaw(title.title)
				
				wikitext = wikitext.replace(linkRegExp, function (link) {
					const hyperLink = new HyperLink(link)
					hyperLink.linkText = params.to
					console.log('From '+link+' to '+hyperLink.wikitext)
					return hyperLink.wikitext
				});
				await wiki.edit({
					title: title.title,
					text: wikitext,
					summary: `Changing links from ${params.from} to ${params.to}`,
				}).then(_ => console.log(title.title + ' has been successfully edited.'));
				await sleep(1000)
			}

			for (var i = 0; i < whatEmbeddedHere.length; i++) {
				const title = whatEmbeddedHere[i]
				var wikitext = await wiki.getRaw(title.title)
				
				wikitext = wikitext.replace(new RegExp(`{{:?${params.from}\\|[\\w\\s\\d-]*}}`, 'gi'), function (embbed) {
					return embbed.replace(params.from, params.to)
				});
				await wiki.edit({
					title: title.title,
					text: wikitext,
					summary: `Changing links from ${params.from} to ${params.to}`,
				}).then(_ => console.log(title.title + ' has been successfully edited.'));
				await sleep(1000)
			}

			for (var i = 0; i < whatUsedThisFile.length; i++) {
				const title = whatUsedThisFile[i]
				var wikitext = await wiki.getRaw(title.title)
				
				wikitext = wikitext.replace(new RegExp(params.from, 'gi'), params.to);
				await wiki.edit({
					title: title.title,
					text: wikitext,
					summary: `Changing links from ${params.from} to ${params.to}`,
				}).then(_ => console.log(title.title + ' has been successfully edited.'));
				await sleep(1000)
			}

			resolve()
		})
	},
	delete (params: {
		title?: string,
		pageid?: pageId,
		reason: string,
		tags?: string,
		watchlist?: watchlistOptions,
		oldimage?: string,
	}) {
		return new Promise<void>(async function (resolve, reject) {
			const postEvent = new WikiPostEvent('delete', params);
			postEvent.onPost(() => resolve());
			wiki.waitlist.addEvent(postEvent);
		})
	},
	_delete (params: LooseObject): Promise<deleteResponse> {
		return new Promise(async function (resolve, reject) {
			wiki.getToken('csrf').then(requestTheDeletion);

			function requestTheDeletion(response: any) {
				const deletion_params = {
					action: 'delete',
					token: response.data.query.tokens.csrftoken,
					// bot is unrecognized
					format: 'json',
					...params,
				}

				wiki.post(deletion_params)
					.then(function (response: AxiosResponse<deleteResponse>) {
						resolve(response.data)
					})
					.catch(function (err) {
						console.error(err)
					})
			}
		})
	},
	move (params: {
		from?: string,
		fromid?: pageId,
		to: string,
		reason: string,
		movetalk?: boolean,
		movesubpages?: boolean,
		noredirect?: boolean,
		tags?: string,
		watchlist?: watchlistOptions,
		ignorewarnings?: boolean,
	}) {
		return new Promise<void>(async function (resolve, reject) {
			const postEvent = new WikiPostEvent('move', params);
			postEvent.onPost(response => resolve(response));
			wiki.waitlist.addEvent(postEvent);
		})
	},
	_move (params: LooseObject): Promise<moveResponse> {
		return new Promise(function (resolve, reject) {
			// step 1
			wiki.getToken('csrf').then(requestTheMove);

			// step 2
			function requestTheMove(response: any) {
				const edit_params = {
					action: 'move',
					token: response.data.query.tokens.csrftoken,
					// bot is unrecognized
					...params,
					format: 'json',
				}

				wiki.post(edit_params)
					.then(function (response: AxiosResponse<moveResponse>) {
						resolve(response.data)
					})
					.catch(function (err) {
						console.error(err)
					})
			}
		})
	},
	uploadImage (params: {
		url?: string,
		wikiUrl?: string,
		localUrl?: string,
		fileDestination: string,
		text?: string,
		comment?: string,
		trim?: boolean,
		rotate?: number,
		debugOnly?: boolean,
	}) {
		return new Promise<void>(async function (resolve, reject) {
			const postEvent = new WikiPostEvent('uploadImage', params);
			postEvent.onPost(result => resolve(result));
			wiki.waitlist.addEvent(postEvent);
		})
	},
	_uploadImage (params: LooseObject) {
		return new Promise(async function (resolve, reject) {
			// step 1
			const token = await wiki.getToken('csrf');

			// step 2
			if (params.url) {
				axios.head(params.url)
					.then(_ => {
						Jimp.read(params.url)
							.then(parseImage)
							.catch(errorHandler);
					})
					.catch(_ => {
						console.error('This URL - ' + params.url +' - doesn\'t exist, my guy.')
						resolve('')
					})
			}
			if (params.wikiUrl) {
				const response = await wiki.pathApi('Special:Redirect/file/'+params.wikiUrl.replace('File:', ''))
				Jimp.read(response.request.res.responseUrl)
					.then(parseImage)
					.catch(errorHandler);
			}
			if (params.localUrl) {
				const response = await fsPromises.readFile(params.localUrl);
				Jimp.read(response)
					.then(parseImage)
					.catch(errorHandler);
			}

			// step 3
			async function parseImage(image: Jimp) {
				if (params.rotate) {
					image = image.rotate(params.rotate);
				}
				if (params.trim) {
					const blankCanvas = await Jimp.create(image.getWidth() + 2, image.getHeight() + 2);
					image = blankCanvas
						.clone()
						.blit(image, 1, 1)
						.autocrop()
				}

				storeImage(image);
			}

			// step 4
			async function storeImage(image: Jimp) {
				image
					.writeAsync('./images/Storage.png')
					.then(function () {
						uploadImage()
					})
					.catch(errorHandler);
			}

			// step 5
			async function uploadImage() {
				const stream = fs.createReadStream('./images/Storage.png');
				const form = new FormData();

				form.append('action', 'upload');
				form.append('filename', params.fileDestination);
				form.append('ignorewarnings', '1');
				form.append('token', token.data.query.tokens.csrftoken);
				form.append('format', 'json');
				if (params.text) {
					form.append('text', params.text)
				}
				if (params.comment) {
					form.append('comment', params.comment)
				}
				form.append('file', stream);

				form.getLength(function (err, length) {
					if (params.debugOnly) {
						resolve('Terminated proccess with success.')
						return;
					}
					axios.post('https://tamingio.fandom.com/api.php', form, {
						headers: {
							'Content-Length': length,
							'Content-Disposition': 'form-data',
							Cookie: wiki.cookies.list,
						},
					})
						.then(response => resolve(response.data))
						.catch(errorHandler)
				})
			}
		})
	}
}

const sleep = (ms: number) => {
	return new Promise(resolve => setTimeout(resolve, ms))
}

class HyperLink {
	visualText: string;
	linkText: string;

	private visualTextWithBarRegexp = /(?<=\[\[.*\|).*(?=]])/;
	private linkTextWithBarRegexp = /(?<=\[\[).*(?=\|.*]])/;
	private noBarRegexp = /(?<=\[\[).*(?=]])/;

	constructor (linkString: string) {
		if (!linkString.includes('|')) {
			if (linkString.match(this.noBarRegexp) == null) {
				throw new Error('')
			}
			// @ts-ignore
			this.linkText = linkString.match(this.noBarRegexp)[0]
			// @ts-ignore
			this.visualText = linkString.match(this.noBarRegexp)[0]
			return
		}
		if (!linkString.match(this.linkTextWithBarRegexp)) {
			throw new Error('')
		}
		if (!linkString.match(this.visualTextWithBarRegexp)) {
			throw new Error('')
		}
		// @ts-ignore
		this.linkText = linkString.match(this.linkTextWithBarRegexp)[0];
		// @ts-ignore
		this.visualText = linkString.match(this.visualTextWithBarRegexp)[0];
	}

	get wikitext () {
		if (this.linkText == this.visualText) {
			return '[['+this.linkText+']]'
		}
		return '[['+this.linkText+'|'+this.visualText+']]'
	}
}

export default wiki;