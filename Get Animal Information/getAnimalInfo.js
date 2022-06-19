const wiki_tools = (function () {
    // needed because taming.io doesn't allow console.log
    const customConsole = {
        logs: [],
        log: function (str) {
            customConsole.logs.push(str);
        }
    };
    // storage elements by their id
    const idStorage = {};
    function getId(id) {
        if (idStorage[id] !== undefined) {
            return idStorage[id];
        }
        else {
            idStorage[id] = document.getElementById(id);
            return idStorage[id];
        }
    }
    function capitalizeFirstLetter(str) {
        return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    }
    const Lua = {
        primitiveString(primitive) {
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
            customConsole.log("Primitive " + primitive + " was attempted to be turned into a string, but it is of type " + type);
        },
        transformIntoLuaObject(obj) {
            const keys = Object.keys(obj);
            // create luaCode variable, where we'll store the Lua code
            let luaCode = [];
            // if it is an array
            if (Object.prototype.toString.call(obj) === '[object Array]') {
                for (var i = 0, l = keys.length; i < l; i++) {
                    luaCode.push(`${Lua.primitiveString(obj[keys[i]])},`);
                }
            }
            else {
                // loops through every argument and adds it to luaCode
                for (var i = 0, l = keys.length; i < l; i++) {
                    luaCode.push(`['${keys[i]}'] = ${Lua.primitiveString(obj[keys[i]])},`);
                }
            }
            // returns luaCode with a closing bracket
            return "{\n" + Lua.addTab(luaCode.join("\n")) + "\n}";
        },
        addTab: function (str, amount = 1) {
            return str.replace(/^/gm, (function () {
                let str = '';
                for (var i = 0; i < amount; i++) {
                    str = str + '\t';
                }
                return str;
            })());
        }
    };
    const optimizeCode = {
        weight: 0,
        start: function () {
            if (this.weight === 0) {
                getId("bod").style.display = "none";
            }
            ;
            this.weight++;
        },
        end: function () {
            this.weight--;
            if (this.weight === 0) {
                getId("bod").style.display = "block";
            }
            ;
        }
    };
    const ui_animals = (function self() {
        const petCardsList = getId("pet-cards-list");
        // if it hasn't been opened yet (because it has no children), open it
        if (petCardsList.childElementCount === 0) {
            getId("staging-change-pet0").click();
            getId("quit-pets-box").click();
        }
        // make an enum with the animals
        let codeNameList;
        (function (codeNameList) {
            codeNameList["Player Damage"] = "player_dmg";
            codeNameList["Animal Damage"] = "animal_dmg";
            codeNameList["Building Damage"] = "building_dmg";
            codeNameList["Player Damage Over Time"] = "player_dmg_ot";
            codeNameList["Animal Damage Over Time"] = "animal_dmg_ot";
            codeNameList["Building Damage Over Time"] = "building_dmg_ot";
            codeNameList["Reloading"] = "reload";
            codeNameList["Steal"] = "steal";
            codeNameList["Vampirism"] = "vampirism";
            codeNameList["Slow Down"] = "slowdown";
            codeNameList["Reduce attack"] = "dmg_reduction";
            codeNameList["Damage reduction"] = "dmg_reduction";
            codeNameList["Increase attack"] = "increase_attack";
            codeNameList["Defense Malus"] = "defense_malus";
            codeNameList["Heal Over Time"] = "heal_ot";
            codeNameList["Speed Bonus"] = "speed_bonus";
        })(codeNameList || (codeNameList = {}));
        ;
        function addLuaCopyButtons() {
            // loop through every child of petCardsList
            for (var i = 0, petCardsListChildren = petCardsList.children, l = petCardsListChildren.length; i < l; i++) {
                // get the current child
                const petCardsListChild = petCardsListChildren[i];
                // get the tame element
                const tamedPetsNode = petCardsListChild.getElementsByClassName("tamodex-pet-hover-tame")[0];
                // add the click event listener to it
                tamedPetsNode.addEventListener("click", function () {
                    navigator.clipboard.writeText(Lua.transformIntoLuaObject(createAnimal(petCardsListChild)));
                });
            }
        }
        function createAnimal(petCardsListChild) {
            // start client-side optimization
            optimizeCode.start();
            function createAttributeDetails(tableRow) {
                const tableRowChildren = tableRow.children;
                function createAttribute(attribute) {
                    // if there is NOT % on the attribute, then parse it as an interger
                    if (attribute.match(/[%]/) === null) {
                        return parseInt(attribute);
                    }
                    return attribute;
                }
                function matchCodeName(name) {
                    if (name !== "Damage Over Time") {
                        if (codeNameList[name] === undefined) {
                            customConsole.log(name + " is undefined");
                        }
                        return codeNameList[name];
                    }
                    else {
                        // @ts-ignore
                        const imageSource = tableRowChildren[0].firstElementChild.src;
                        // the source can be one of: player-time.png, animal-time.png and building-time.png
                        if (imageSource.indexOf("player") !== -1) {
                            return codeNameList["Player Damage Over Time"];
                        }
                        if (imageSource.indexOf("animal") !== -1) {
                            return codeNameList["Animal Damage Over Time"];
                        }
                        return codeNameList["Building Damage Over Time"];
                    }
                }
                return {
                    code_name: matchCodeName(tableRowChildren[0].textContent),
                    baby_attribute: createAttribute(tableRowChildren[1].textContent),
                    adult_attribute: createAttribute(tableRowChildren[2].textContent),
                    boss_attribute: createAttribute(tableRowChildren[3].textContent),
                };
            }
            function createEmptyGeneralStat() {
                return {
                    type: "",
                    weight: "",
                    tool: "",
                    biome: "",
                    mount: "",
                    shield: "",
                    taming_chance: 0,
                    skill: "",
                    skill_description: "",
                    skill_stats: [],
                };
            }
            function createEmptyStat() {
                return {
                    health: 0,
                    dmg: 0,
                    speed: 0,
                    weight: 0,
                    regen_points: 0,
                    regen_speed: 0,
                    skill: {},
                };
            }
            const animal = {
                general: createEmptyGeneralStat(),
                baby: createEmptyStat(),
                adult: createEmptyStat(),
                boss: createEmptyStat(),
            };
            // @ts-ignore to open the tamodex
            petCardsListChild.getElementsByClassName("tamodex-pet-hover-see")[0].click();
            // store the ages
            const ages = ["baby", "adult", "boss"];
            // loop through every iteration of age and add its info
            for (var i = 0; i < 3; i++) {
                const age = ages[i];
                getId("tamodex-radar-chart-" + age).click();
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
            // @ts-ignore
            // the src is one of mini-weight0.png, mini-weight1.png and mini-weight2.png
            const weightSrcNumber = getId("weight-image").src.substr(-5, 1);
            // if 0, then its light; if 1, then its balanced; and else, its cumbersome (presumably 2)
            animal.general.weight = weightSrcNumber == "0" ?
                "Light" : weightSrcNumber == "1" ?
                "Balanced" : "Cumbersome";
            // @ts-ignore
            // the src is one of mini-tame-stone.png and mini-tame-apple.png
            const tameSrcNumber = getId("tame-preference").src.substr(-6, 1);
            // if n, then its stone; else, its apple
            animal.general.tool = tameSrcNumber == "n" ? "Slingshot" : "Appletor";
            // shield; if you can see it, then its shieldable; else, its not
            animal.general.shield =
                getId("shield-box").style.display === "flex" ? "Shieldable" : "Unshieldable";
            // mount; if you can see it, then its unmountable; else, it is
            animal.general.mount =
                getId("mount-box").style.display === "flex" ? "Unmountable" : "Mountable";
            // **************
            // SKILL STATS
            // **************
            getId("tamodex-skill-button-image").click();
            // @ts-ignore
            animal.general.type = capitalizeFirstLetter(getId("own-type-picture").src.match(/(\w*)\-icon/)[1]);
            animal.general.skill = getId("skill-name").textContent;
            animal.general.skill_description = getId("skill-description").textContent;
            // TABLE OF STATS
            const statsTableChildren = getId("skill-table-description").children;
            for (var i = 1, l = statsTableChildren.length; i < l; i++) {
                const attributeDetails = createAttributeDetails(statsTableChildren[i]);
                const attributeCodeName = attributeDetails.code_name;
                animal.general.skill_stats.push(attributeCodeName);
                animal.baby.skill[attributeCodeName] = attributeDetails.baby_attribute;
                animal.adult.skill[attributeCodeName] = attributeDetails.adult_attribute;
                animal.boss.skill[attributeCodeName] = attributeDetails.boss_attribute;
            }
            getId("back-to-pet").click();
            getId("back-to-pet-selection").click();
            optimizeCode.end();
            return animal;
        }
        setTimeout(addLuaCopyButtons);
        return {
            createAnimal: createAnimal,
            codeNameList: codeNameList,
        };
    })();
    return {
        animals: ui_animals,
        customConsole: customConsole
    };
})();
