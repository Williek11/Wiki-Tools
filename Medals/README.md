This file contains the code for the medals script I use in the wiki. To execute it, you must:
* Have [Node.js](https://nodejs.org/pt-br/download/) installed.
* Make a [bot password](http://tamingio.fandom.com/wiki/Special:BotPasswords). This is because the API that is used cannot use the normal login info.
* Add your bot password to `Credentials.txt`. Just fill-in the blanks and done!
Now, you can execute the script by typing, in the command line and making sure that you're in the directory that the files are on:
<pre><code>node.js medals.js</code></pre>
Done! If you want to edit the .ts files, which contain the unchanged source code, you need to install [TypeScript](https://www.typescriptlang.org/download). Then, once you have saved your changes, type on the command line:
<pre><code>tsc --build</code></pre>
I personally recommend you to have a code editor to help you edit the files, if you so choose. You can also edit directly the .js files, although do note that if you do `tsc --build` then, you will lose any changes that you might have made directly to the .js files.
