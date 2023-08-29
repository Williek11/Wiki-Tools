"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const jsdom_1 = require("jsdom");
const update_api = (function () {
    class UpdateTitle {
        // .update-title
        constructor(titleNode) {
            const dateNode = titleNode.querySelector('.changelog-date.flex-left-auto');
            this.name = titleNode.getElementsByTagName('p')[0].textContent || 'UNDEFINED';
            // @ts-ignore
            this.day = dateNode.textContent.match(/\d+\/(\d+)\/\d+/)[1];
            // @ts-ignore
            this.month = dateNode.textContent.match(/(\d+)\/\d+\/\d+/)[1];
            // @ts-ignore
            this.year = dateNode.textContent.match(/\d+\/\d+\/(\d+)/)[1];
        }
        toTemplate() {
            return [
                '| title = ' + this.name,
                '| month = ' + this.month,
                '| day = ' + this.day,
                '| year = ' + this.year,
            ].join('\n');
        }
    }
    class Group {
        constructor(name) {
            this.content = [];
            this.name = name;
        }
        addContent(content) {
            this.content.push(content);
        }
        toTemplate() {
            if (this.name.toLowerCase() === 'bugs') {
                return '{{Update_Header|BUGS}}\n* {{#var:bugmessage}}';
            }
            return '{{Update_Header|' + this.name + '}}\n' + this.content
                .map(subItem => subItem.toTemplate())
                .join('\n')
                .replace(/\*(?=\w)/g, '* ');
        }
    }
    class ListContent {
        constructor() {
            this.content = [];
        }
        addContent(content) {
            this.content.push(content);
        }
        toTemplate() {
            return '*' + this.content
                .map(subItem => subItem
                .toTemplate()
                .replace(/\n\*/gm, '\n**'))
                .join('\n*');
        }
    }
    class TextContent {
        constructor(text) {
            this.text = text.trim();
        }
        toTemplate() {
            return this.text;
        }
    }
    class SubHeader {
        constructor(name) {
            this.name = name;
        }
        toTemplate() {
            return `{{Update_Header2|${this.name.toUpperCase()}}}`;
        }
    }
    // .update-content
    function interpretContent(updateContent) {
        const Data = {
            groups: [],
            currentGroup: new Group('null'),
        };
        function recursivelyInterpretUL(ulElement) {
            const listContent = new ListContent();
            for (var i = 0, children = ulElement.children; i < children.length; i++) {
                if (children[i].tagName === 'LI') {
                    listContent.addContent(new TextContent(children[i].textContent || 'null'));
                }
                else if (children[i].tagName === 'UL') {
                    listContent.addContent(recursivelyInterpretUL(children[i]));
                }
            }
            return listContent;
        }
        for (var i = 0, children = updateContent.children; i < children.length; i++) {
            if (children[i].classList.contains('scroll-subtitle')) {
                Data.currentGroup = new Group(children[i].textContent || 'null');
                Data.groups.push(Data.currentGroup);
            }
            else if (children[i].classList.contains('c-white')) {
                Data.currentGroup.addContent(recursivelyInterpretUL(children[i]));
            }
            else if (children[i].classList.contains('scroll-subtitle1')) {
                Data.currentGroup.addContent(new SubHeader(children[i].textContent || ''));
            }
        }
        ;
        return Data.groups;
    }
    // .scroll-content-bg
    function createUpdateTemplate(updateWrapper, version) {
        const title = new UpdateTitle(updateWrapper.getElementsByClassName('update-title')[0]);
        const content = interpretContent(updateWrapper.getElementsByClassName('update-content')[0]);
        const templatedContent = content
            .map(obj => obj.toTemplate())
            .join('\n');
        return {
            name: title.name,
            day: title.day,
            month: title.month,
            year: title.year,
            content: templatedContent,
            template: [
                '{{Update',
                '| version = 0.' + version,
                title.toTemplate(),
                '| noheader = \n' + templatedContent,
                '}}'
            ].join('\n')
        };
    }
    return {
        createUpdateTemplate
    };
})();
var Mode;
(function (Mode) {
    Mode[Mode["ListUnknown"] = 0] = "ListUnknown";
    Mode[Mode["ListSpecified"] = 1] = "ListSpecified";
})(Mode || (Mode = {}));
(async function main() {
    function standardize(str) {
        return str
            .toLowerCase()
            .replace(/[ \n]/g, '');
    }
    const years = [];
    const changelog = new jsdom_1.JSDOM((await axios_1.default.get('https://taming.io/')).data);
    for (var i = new Date().getFullYear(); i >= 2020; i--) {
        years.push(i);
    }
    let content = '';
    for (const year of years) {
        const page = await axios_1.default.get('https://tamingio.fandom.com/Game Changelog/' + year + '?action=raw');
        content += standardize(page.data);
    }
    const updateElements = changelog.window.document.getElementsByClassName('scroll-content-bg');
    const args = process.argv.slice(2);
    let activeMode = Mode.ListUnknown;
    if (args.length > 0) {
        console.log("Arguments were specified. Entering ListSpecified mode.");
        activeMode = Mode.ListSpecified;
    }
    else {
        console.log("No arguments were specified. Entering ListUnknown mode.");
    }
    switch (activeMode) {
        case Mode.ListUnknown:
            for (const element of updateElements) {
                const template = update_api.createUpdateTemplate(element, updateElements.length - 6);
                if (!content.includes(standardize(template.name))) {
                    console.log(template.template);
                }
            }
            break;
        case Mode.ListSpecified:
            for (const element of updateElements) {
                const template = update_api.createUpdateTemplate(element, updateElements.length - 6);
                for (var j = 0; j < args.length; j++) {
                    if (standardize(args[j]) == standardize(template.name))
                        console.log(template.template);
                }
            }
            break;
        default:
            console.log("Hold on, Houston! We have a problem!");
            break;
    }
})();
