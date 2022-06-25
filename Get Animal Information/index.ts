const wiki = (function(){
    type looseObject = {
        [key: string]: any,
    };

    // creates a custom console of sorts since taming.io
    // doesn't allow normal console usage
    const customConsole = (function(){
        // console logs list
        const logs = {
            info: [],
            error: [],
        };

        // console info function
        function info (str: string) {
            // adds a log to logs.info
            logs.info.push(str);

            // uses console.dir to register logs
            console.dir("WIKI LOG: "+str)
        };

        // console error function
        function error (str: string) {
            // adds a log to logs.error
            logs.error.push(str);
            
            // uses console.dir to register errors
            console.dir([
                "////////////////////",
                "//// WIKI ERROR ////",
                "////////////////////",
                str,
            ].join("\n"));
        };

        return {
            info: info,
            error: error,
            toString () {
                return [
                    "/////////////////////////////",
                    "//// Wiki console report ////",
                    "/////////////////////////////",
                    "",
                    `Info: ${logs.info.length > 0 ? logs.info.join(" // ") + ` (${logs.info.length})` : "No info logs (0)"}`, 
                    `Errors: ${logs.error.length > 0 ? logs.error.join(" // ") + ` (${logs.error.length})` : "No error logs (0)"}`,
                ].join("\n");
            }
        }
    })();

    // helper function for typescript annotations
    function treatAsImage (element: Node) {
        return element as HTMLImageElement
    }

    // helper function for typescript annotations
    function treatAsDiv (element: Node) {
        return element as HTMLDivElement
    }

    // returns parentElement.getElementById(id),
    // but the caveat is that it caches the result, and that makes
    // for a big performance boost
    const getId = (function(){
        // storage purposes
        const idCacheStorage = {};

        // returns the actual function
        return function (id: string): HTMLElement {
            // if it has already been stored, then return the stored element
            if (idCacheStorage[id] !== undefined) {
                return idCacheStorage[id];
            }
    
            // if not, then store it
            idCacheStorage[id] = document.getElementById(id);
    
            // if the store copy is undefined even after storing it
            // then that means it does not exist; therefore, we log
            // an error message
            if (idCacheStorage[id] === undefined) {
                customConsole.error("There is no match for element #"+id+".");
            }
    
            // return the stored element
            return idCacheStorage[id];
        }
    })();

    // returns parentElement.getElementsByClassName(className)[0],
    // but the caveat is that it caches the result, and that makes
    // for a big performance boost
    const getSpecifiedClassElement = (function(){
        // storage purposes
        const classCacheStorage = {}
        
        // creates a sort of universal 'wiki id'
        function formatWikiId (id: string, className: string) {
            return id + " " + className;
        }

        // returns the actual function
        return function (parentElement: HTMLElement, className: string): HTMLElement {
            const id = parentElement.dataset['wikiId'];

            if (id === undefined) {
                parentElement.dataset['wikiId'] = ""+Math.random();
            };

            // if it has already been stored, then return the stored element
            if (classCacheStorage[formatWikiId(id, className)] !== undefined) {
                return classCacheStorage[formatWikiId(id, className)];
            };

            // if not, then store it
            classCacheStorage[formatWikiId(id, className)] = parentElement.getElementsByClassName(className)[0];

            // return the stored element
            return classCacheStorage[formatWikiId(id, className)];
        };
    })();

    // function to add css
    const injectCSS = (function(){
        const style = document.createElement("style")
        document.head.appendChild(style);

        return function (css: string) {
            // adds the css to its text
            style.textContent = style.textContent + css;
        };
    })();

    // capitalizes first letters and lowercases all else
    // for example, inputted "aMoNg Us", the output will be "Among Us"
    function capitalizeFirstLetter(str: string) {
        return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    }

    // turns strings into kebab case
    function toKebabCase (str: string) {
        return str.toLowerCase().replaceAll(" ", "-")
    }

    // lua helper functions
    const Lua = {
        // turns javascript primitives into lua
        primitiveString (primitive: any) {
            const type = typeof primitive;
            
            if (type === "number" || type === "boolean") {
                return primitive.toString();
            }
            if (type === "string") {
                return "'" + primitive.replaceAll("'", "\'") + "'";
            }
            if (type === "object") {
                return Lua.transformIntoLuaObject(primitive);
            }
            customConsole.error("Wiki - primitiveString: Primitive " + primitive + " was attempted to be turned into a string, but it is of type "+type)
        },
        // turns jabascript objects into lua objects
        transformIntoLuaObject (obj: looseObject) {
            const keys = Object.keys(obj);

            // create luaCode variable, where we'll store the Lua code
            let luaCode = [];

            // if it is an array
            if (Object.prototype.toString.call(obj) === '[object Array]') {
                // avoid being tabbed
                const luaArrayCode = [];

                for (var i = 0, l = keys.length; i < l; i++) {
                    luaArrayCode.push(Lua.primitiveString(obj[keys[i]]))
                }

                luaCode.push(luaArrayCode.join(", "));
            }
            // if it is an object
            else {
                // loops through every argument and adds it to luaCode
                for (var i = 0, l = keys.length; i < l; i++) {
                    luaCode.push(`['${keys[i]}'] = ${Lua.primitiveString(obj[keys[i]])},`)
                }
            }

            // returns luaCode with a closing bracket
            return "{\n" + Lua.addTab(luaCode.join("\n")) + "\n}";
        },
        // adds tabs to the code
        addTab: function (str: string, amount = 1) {
            // matches all of the starts of line
            return str.replace(/^/gm, (function (){
                let str = '';

                for (var i = 0; i < amount; i++) { str = str + '\t'; }
                
                return str
            })());
        }
    }

    // optimizes slightly code execution
    const optimizeCode = {
        weight: 0,
        start: function () {
            if (this.weight === 0) { getId("bod").style.display = "none" };
            this.weight++;
        },
        end: function () {
            this.weight--;
            if (this.weight === 0) { getId("bod").style.display = "block" };
        }
    }

    const ui_animals = (function self (){
        const petCardsList = getId("pet-cards-list");

        for (var i = 0, children = petCardsList.children as HTMLCollectionOf<HTMLElement>, l = children.length; i < l; i++) {
            getSpecifiedClassElement(children[i], "tamodex-badge-container");
        };

        for (var i = 0, children = petCardsList.children as HTMLCollectionOf<HTMLElement>, l = children.length; i < l; i++) {
            getSpecifiedClassElement(children[i], "tamodex-pet-hover-see");
        };

        // constructors are functions that build elements
        const constructors = {
            // creates an empty animal's general stats
            createEmptyGeneral () {
                return {
                    type: "" as string | string[],
                    weight: "",
                    tool: "",
                    biome: "",
                    mount: "",
                    shield: "",
                    taming_chance: 0,
                    skill: "",
                    skill_description: "",
                    skill_stats: [],
                }
            },
            // creates an empty animal's stats
            createEmptyStat () {
                return {
                    health: 0,
                    dmg: 0,
                    speed: 0,
                    weight: 0,
                    regen_points: 0,
                    regen_speed: 0,
                    skill: {},
                }
            },
            // returns the animal's type (Normal, Fairy, etc)
            createTypeDetails (badgeContainer: HTMLDivElement) {
                const badgeContainerChildren = badgeContainer.children as HTMLCollectionOf<HTMLImageElement>;

                if (badgeContainerChildren.length === 1) {
                    return capitalizeFirstLetter(badgeContainerChildren[0].src.match(/(\w*)\-icon/)[1])
                }
                return [
                    capitalizeFirstLetter(badgeContainerChildren[0].src.match(/(\w*)\-icon/)[1]),
                    capitalizeFirstLetter(badgeContainerChildren[1].src.match(/(\w*)\-icon/)[1])
                ]
            },
            // returns the animal's skill attributes
            // (damage to animals, vampirism, etc)
            createAttributeDetails (tableRow: HTMLTableRowElement) {
                const tableRowChildren = tableRow.children;
                
                function createAttribute (attribute: string) {
                    // if there is NOT % on the attribute, then parse it as an interger
                    if (attribute.match(/[%]/) === null) {
                        return parseInt(attribute);
                    }
                    return attribute;
                }

                function matchCodeName(name: string) {
                    if (name !== "Damage Over Time") {
                        if (codeNameList[name] === undefined) {
                            customConsole.error("Wiki - matchCodeName: " + name + " is undefined")
                        }
                        return codeNameList[name];
                    } else {
                        const imageSource = treatAsImage(tableRowChildren[0].firstElementChild).src;

                        // the source can be one of: player-time.png, animal-time.png and building-time.png
                        if (imageSource.indexOf("player") !== -1) {
                            return codeNameList["Player Damage Over Time"]
                        }
                        if (imageSource.indexOf("animal") !== -1) {
                            return codeNameList["Animal Damage Over Time"]
                        }
                        return codeNameList["Building Damage Over Time"]
                    }
                }

                return {
                    code_name: matchCodeName(tableRowChildren[0].textContent),
                    baby_attribute: createAttribute(tableRowChildren[1].textContent),
                    adult_attribute: createAttribute(tableRowChildren[2].textContent),
                    boss_attribute: createAttribute(tableRowChildren[3].textContent),
                }
            },
        }

        // if it hasn't been opened yet (because it has no children), open it
        if (petCardsList.childElementCount === 0) {
            getId("staging-change-pet0").click();
            getId("quit-pets-box").click();
        }

        // make an enum with the animals
        enum codeNameList {
            'Player Damage' = 'player_dmg',
            'Animal Damage' = 'animal_dmg',
            'Building Damage' = 'building_dmg',
            'Player Damage Over Time' = 'player_dmg_ot',
            'Animal Damage Over Time' = 'animal_dmg_ot',
            'Building Damage Over Time' = 'building_dmg_ot',
            'Reloading' = 'reload',
            'Steal' = 'steal',
            'Vampirism' = 'vampirism',
            'Slow Down' = 'slowdown',
            'Reduce attack' = 'reduce_attack',
            'Damage reduction' = 'dmg_reduction',
            'Increase attack' = 'increase_attack',
            'Defense Malus' = 'defense_malus',
            'Heal Over Time' = 'heal_ot',
            'Speed Bonus' = 'speed_bonus',
        };
        
        function getAllAnimalsInfo () {
            // start client-side optimization
            optimizeCode.start();

            // store the animals
            const animals = {};

            // loop through every child of petCardsList
            for (var i = 0, petCardsListChildren = petCardsList.children, l = petCardsListChildren.length; i < l; i++)
            {
                // get the current child
                const petCardsListChild = petCardsListChildren[i] as HTMLDivElement;

                // create an animal with it and add it to animals object
                const result = createAnimal(petCardsListChild, { stayOnPetSkills: true, });

                // animals[animal_name] = result
                animals[capitalizeFirstLetter(getId("pet-name-card").textContent)] = result;
            }

            // stop client-side optimization
            optimizeCode.end();

            // return animals object
            return animals;
        }

        function createAnimal (petCardsListChild: HTMLDivElement, animalCreationOptions: {
            stayOnPetSkills?: boolean,
            stayOnPetProperties?: boolean,
        } = {}) {
            // start client-side optimization
            optimizeCode.start();

            const animal = {
                general: constructors.createEmptyGeneral(),
                baby: constructors.createEmptyStat(),
                adult: constructors.createEmptyStat(),
                boss: constructors.createEmptyStat(),
            };
            
            animal.general.type = constructors.createTypeDetails(
                treatAsDiv(getSpecifiedClassElement(petCardsListChild, "tamodex-badge-container"))
            )

            // to open the tamodex
            treatAsDiv(getSpecifiedClassElement(petCardsListChild, "tamodex-pet-hover-see")).click();

            // store the ages
            const ages = ["baby", "adult", "boss"]
            
            // loop through every iteration of age and add its info
            for (var i = 0; i < 3; i++) {
                const age = ages[i];

                getId("tamodex-radar-chart-"+age).click();
                
                animal[age].speed = parseInt(getId("tamodex-radar-chart-value-speed").textContent);
                animal[age].regen_points = parseInt(getId("tamodex-radar-chart-value-regen-points").textContent);
                animal[age].health = parseInt(getId("tamodex-radar-chart-value-health").textContent);
                animal[age].regen_speed = parseInt(getId("tamodex-radar-chart-value-regen-speed").textContent);
                animal[age].dmg = parseInt(getId("tamodex-radar-chart-value-attack").textContent);
                animal[age].weight = parseInt(getId("tamodex-radar-chart-value-weight").textContent);
            }

            // **************
            // GENERAL STATS
            // **************

            // the src is one of mini-weight0.png, mini-weight1.png and mini-weight2.png
            const weightSrcNumber = treatAsImage(getId("weight-image")).src.substr(-5, 1);

            // if 0, then its light; if 1, then its balanced; and else, its cumbersome (presumably 2)
            animal.general.weight = weightSrcNumber == "0" ?
                "Light" : weightSrcNumber == "1" ?
                "Balanced" : "Cumbersome";

            // the src is one of mini-tame-stone.png and mini-tame-apple.png
            const tameSrcNumber = treatAsImage(getId("tame-preference")).src.substr(-6, 1);

            // if n, then its stone; else, its apple
            animal.general.tool = tameSrcNumber == "n" ? "Slingshot" : "Appletor";

            // shield; if you can see it, then its shieldable; else, its not
            animal.general.shield =
                getId("shield-box").style.display === "flex" ? "Shieldable" : "Unshieldable";

            // mount; if you can see it, then its unmountable; else, it is mountable
            animal.general.mount =
                getId("mount-box").style.display === "flex" ? "Unmountable" : "Mountable";

            // **************
            // SKILL STATS
            // **************

            getId("tamodex-skill-button-image").click();

            animal.general.skill = getId("skill-name").textContent;
            animal.general.skill_description = getId("skill-description").textContent;

            // TABLE OF STATS
            const statsTableChildren = getId("skill-table-description").children;

            for(var i = 1, l = statsTableChildren.length; i < l; i++) {
                const attributeDetails = constructors.createAttributeDetails(statsTableChildren[i] as HTMLTableRowElement);
                const attributeCodeName = attributeDetails.code_name;
                animal.general.skill_stats.push(attributeCodeName);
                animal.baby.skill[attributeCodeName] = attributeDetails.baby_attribute;
                animal.adult.skill[attributeCodeName] = attributeDetails.adult_attribute;
                animal.boss.skill[attributeCodeName] = attributeDetails.boss_attribute;
            }

            // if the option of staying on pet skills is NOT defined or false
            if (!animalCreationOptions.stayOnPetSkills)
                getId("back-to-pet").click();
            
            // if the option of staying on pet properties is NOT defined or false
            if (!animalCreationOptions.stayOnPetSkills && !animalCreationOptions.stayOnPetProperties)
                getId("back-to-pet-selection").click();

            optimizeCode.end();

            return animal;
        }

        // **************
        // GUI ELEMENTS
        // **************

        const petWikiButton = document.createElement("div");
        petWikiButton.className = "button-homepage flex-center";
        petWikiButton.addEventListener("click", function () {
            // gets the name of the animal in the #pet-name-card element
            const name = getId("pet-name-card").innerText

            // all pet cards list children have the following id naming: <pet name in kebab case>-pet
            const petCardsListChild = getId(toKebabCase(name) + "-pet");

            // creates an animal object with the petCardsListChild element
            const animalObject = createAnimal(petCardsListChild as HTMLDivElement, {
                stayOnPetProperties: true
            });

            // copies the text in it
            navigator.clipboard.writeText(
                // adds text: ['<animal name>'] =
                "['" + capitalizeFirstLetter(name) + "'] = " +

                // adds the lua object code
                Lua.transformIntoLuaObject(animalObject) +

                // adds a comma; best-practice
                ","
            );
        })
        petWikiButton.innerHTML =
        `<img
            src="./img/interface/copy-paste.png"
            alt="Copy id"
            draggable="false"
            style="width:28px;"
        >`;

        injectCSS('.tamodex-pet-stats-taming { width: 200px; }');

        getSpecifiedClassElement(getId("tamodex-pet-stats"), "flex-between")
            .appendChild(petWikiButton);

        return {
            createAnimal: createAnimal,
            getAllAnimalsInfo: getAllAnimalsInfo,
            codeNameList: codeNameList,
        }
    })();

    return {
        lua_api: Lua,
        animals_api: ui_animals,
        console_logs: customConsole.toString,
    };
})()