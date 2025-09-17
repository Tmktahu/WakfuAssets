/* eslint-disable no-unused-vars */
const baseUrl = "https://www.wakfu.com/en/mmorpg/encyclopedia/classes";
const urlParams = "?_pjax=.ak-spells-panel";

const path = require("path");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const fs = require("fs");
const jsonSpellData = fs.readFileSync("spell_defs.json", "utf8");
const classEncyclopediaBreakdown = JSON.parse(jsonSpellData);

const jsonStatesData = fs.readFileSync("states.json", "utf8");
const statesEncyclopediaBreakdown = JSON.parse(jsonStatesData);

//////// Scraping Logic

const getHtmlSpellData = async () => {
  for (let classIndex in classEncyclopediaBreakdown) {
    let classEntry = classEncyclopediaBreakdown[classIndex];
    let targetClassDirectory = "spellData/" + classEntry.className.toLowerCase() + "/";

    // first we make any missing directories. we assume the /spellData directory already exists.
    if (!fs.existsSync(targetClassDirectory)) {
      fs.mkdir(targetClassDirectory, (error) => {
        if (error) {
          console.log(error);
        }
      });
    }

    // next we iterate over the spells
    for (let spellIndex in classEntry.spells) {
      let spellEntry = classEntry.spells[spellIndex];
      let targetHtmlUrl = baseUrl + classEntry.classUrlPath + spellEntry.spellUrlPath + urlParams;
      let targetFilePath = targetClassDirectory + spellEntry.spellName.toLowerCase().replaceAll(" ", "_").replaceAll("-", "_").replaceAll(",", "") + ".html";
      console.log(targetFilePath);

      let fileExists = await fs.existsSync(targetFilePath);
      if (process.argv.includes("skip-existing") && fileExists) {
        continue;
      }

      let response = await fetch(targetHtmlUrl, {
        headers: {
          "x-pjax": "true",
          "x-pjax-container": ".ak-spells-panel",
          "x-requested-with": "XMLHttpRequest",
        },
      });

      let htmlText = await response.text();

      await fs.writeFile(targetFilePath, htmlText, () => {});

      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
};

const assembleSpellDefData = () => {
  let definitionData = [];
  classEncyclopediaBreakdown.forEach((classEntry) => {
    let targetClassId = classEntry.classId;
    let targetClassName = classEntry.className.toLowerCase();

    classEntry.spells.forEach((spell) => {
      definitionData.push({
        id: spell.spellId,
        name: spell.spellName,
        classId: targetClassId,
        className: targetClassName,
        category: spell.category,
      });
    });
  });

  let stringifiedData = JSON.stringify(definitionData);

  fs.writeFile("spell_definitions.json", stringifiedData, () => {});
};

//////// End Logic

///////// Parsing Logic

// So the theory here is that we iterate over all html blocks and parse out the data we want
const spellData = [
  { className: "Feca", classId: 1, spells: [] },
  { className: "Osamodas", classId: 2, spells: [] },
  { className: "Enutrof", classId: 3, spells: [] },
  { className: "Sram", classId: 4, spells: [] },
  { className: "Xelor", classId: 5, spells: [] },
  { className: "Ecaflip", classId: 6, spells: [] },
  { className: "Eniripsa", classId: 7, spells: [] },
  { className: "Iop", classId: 8, spells: [] },
  { className: "Cra", classId: 9, spells: [] },
  { className: "Sadida", classId: 10, spells: [] },
  { className: "Sacrier", classId: 11, spells: [] },
  { className: "Pandawa", classId: 12, spells: [] },
  { className: "Rogue", classId: 13, spells: [] },
  { className: "Masqueraider", classId: 14, spells: [] },
  { className: "Ouginak", classId: 15, spells: [] },
  { className: "Foggernaut", classId: 16, spells: [] },
  { className: "Eliotrope", classId: 18, spells: [] },
  { className: "Huppermage", classId: 19, spells: [] },
];

const processSpellData = async () => {
  let topDirectory = "./spellData/";
  const directoryContents = await fs.promises.readdir(topDirectory);

  for (const entry of directoryContents) {
    const entryPath = path.join(topDirectory, entry);
    const entryStats = await fs.promises.stat(entryPath);

    let targetClassData = spellData.find((dataEntry) => {
      return dataEntry.className.toLocaleLowerCase() === entry;
    });

    if (entryStats.isDirectory()) {
      await processDirectory(entryPath, targetClassData);
    }
  }

  await writeSpellDataToFile(spellData);
};

const processDirectory = async (targetDirectory, targetClassData) => {
  const files = await fs.promises.readdir(targetDirectory);

  for (const file of files) {
    const className = path.basename(targetDirectory);
    const filePath = path.join(targetDirectory, file);

    await processFile(filePath, targetClassData);
  }
};

const processFile = async (filePath, targetClassData) => {
  const data = await fs.promises.readFile(filePath, "utf8");

  const { window } = new JSDOM(data);
  let document = window.document;

  let newSpellData = assembleSpellData(document, filePath);
  // console.log('newSpellData', newSpellData)
  // newSpellData.spellName = spellName;

  targetClassData.spells.push(newSpellData);
};

const writeSpellDataToFile = (jsonData) => {
  let jsonFilePath = "spell_data.json";
  fs.writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2), (err) => {
    if (err) {
      console.error("Error writing JSON to file:", err);
    } else {
      console.log("JSON data has been written to", jsonFilePath);
    }
  });
};

const assembleSpellData = (document, filePath) => {
  let newSpellData = {};

  let regex = /.*\\([\w\_]+).html/;
  console.log(filePath);
  let fileName = filePath.match(regex)[1];

  const parentDirectory = path.dirname(filePath);
  const className = path.basename(parentDirectory);

  newSpellData.class = className;

  newSpellData.name = getSpellName(document);
  newSpellData.description = getSpellDescription(document);
  newSpellData.iconId = getSpellIcon(document, newSpellData);
  newSpellData.normalEffects = getNormalSpellEffects(document);

  let targetClassEntry = classEncyclopediaBreakdown.find((classEntry) => {
    return classEntry.className.toLowerCase() === className;
  });

  let targetSpellData = targetClassEntry.spells.find((spellEntry) => {
    return spellEntry.spellName.toLowerCase().replaceAll(" ", "_").replaceAll("-", "_").replaceAll(",", "") === fileName;
  });

  newSpellData.id = targetSpellData.spellId;
  newSpellData.category = targetSpellData.category;
  newSpellData.spellUrlPath = targetSpellData.spellUrlPath;

  return newSpellData;
};

// Individual field parsers
const getSpellName = (document) => {
  let parentElement = document.querySelector(".ak-spell-name");
  const textNodes = Array.from(parentElement.childNodes)
    .filter((node) => node.nodeType === 3)
    .map((node) => node.textContent)
    .join("");

  return textNodes.trim();
};

const getSpellIcon = (document, newSpellData) => {
  let imageElem = document.querySelector(`img[alt="${newSpellData.name}"][title="${newSpellData.name}"]`);

  const regexPattern = /\/(\d+)\.png/;
  const matches = imageElem.src.match(regexPattern);
  const extractedId = matches[1];

  return parseInt(extractedId);
};

const getSpellDescription = (document) => {
  let parentElement = document.querySelector(".ak-spell-description");
  let text = parentElement.textContent;

  return text.trim();
};

const getNormalSpellEffects = (document) => {
  let normalEffects = {};
  let previousEntry = null;

  const h2Elements = document.querySelectorAll("h2");
  for (const h2 of h2Elements) {
    if (h2.textContent === "Normal effects") {
      // This is the h2 element with the text 'Normal effects'
      const parent = h2.parentElement;

      let htmlElem = parent.querySelector(".ak-container");
      let htmlText = htmlElem.outerHTML.replaceAll(/data-hasqtip=[\"\\\d\w\_\,]+\"/gi, "");

      if (previousEntry && previousEntry.html === htmlText) {
        continue;
      }

      let levelWrapper = parent.closest(".ak-level-selector-target");
      const regexPattern = /ak-level-(\d+)/;
      const matches = levelWrapper.classList.toString().match(regexPattern);
      const extractedLevel = matches[1];

      normalEffects[extractedLevel] = {
        level: extractedLevel,
        html: htmlText,
        equipEffects: parseEquipEffects(htmlElem),
      };

      previousEntry = normalEffects[extractedLevel];
    }
  }

  return normalEffects;
};

const parseEquipEffects = (effectsContainerElem) => {
  let effects = [];
  let text = effectsContainerElem.outerHTML;

  // Block
  const blockPattern = /<div class="ak-title">\n\s+(\d+)% Block/;
  const blockMatch = text.match(blockPattern);
  if (blockMatch) {
    const number = parseInt(blockMatch[1]);
    effects.push({
      id: "percentBlock",
      rawId: 875,
      text: "% Block",
      value: number,
    });
  }

  // Armor Received
  const armorReceivedPattern = /<div class="ak-title">\n\s+(?:<span.+span> ?)?(-?\d+)% Armor received/;
  const armorReceivedMatch = text.match(armorReceivedPattern);
  if (armorReceivedMatch) {
    const number = parseInt(armorReceivedMatch[1]);
    effects.push({
      id: "armorReceived",
      rawId: 10001,
      text: "% Armor Received",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // Armor Given
  const armorGivenPattern = /<div class="ak-title">\n\s+(?:<span.+span> )?(-?\d+)% Armor given/;
  const armorGivenMatch = text.match(armorGivenPattern);
  if (armorGivenMatch) {
    const number = parseInt(armorGivenMatch[1]);
    effects.push({
      id: "armorGiven",
      rawId: 10000,
      text: "% Armor Given",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // Masqueraider armor Given because ankama can't reliably stick to a pattern for stats
  const masqArmorGivenPattern = /<div class="ak-title">\n\s+(?:<span.+span> ?)?(?:-?\d+)% Armor received, (-?\d+)% Armor given/;
  const masqArmorGivenMatch = text.match(masqArmorGivenPattern);
  if (masqArmorGivenMatch) {
    const number = parseInt(masqArmorGivenMatch[1]);
    effects.push({
      id: "armorGiven",
      rawId: 10000,
      text: "% Armor Given",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // Damage Inflicted
  const damageInflictedPattern = /<div class="ak-title">\n\s+(?:<span.+span> )?(?:- )(-?\d+)% D?d?amage inflicted(?! from | in | by )/;
  const damageInflictedMatch = text.match(damageInflictedPattern);
  if (damageInflictedMatch) {
    const number = parseInt(damageInflictedMatch[1]);
    effects.push({
      id: "damageInflicted",
      rawId: 1,
      text: "% Damage Inflicted",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // Indirect Damage Inflicted
  const indirectDamageInflictedPattern = /<div class="ak-title">\n\s+(?:<span.+span> )?(-?\d+)% (?:I?i?ndirect D?d?amage I?i?nflicted|I?i?ndirect D?d?amage)/;
  const indirectDamageInflictedMatch = text.match(indirectDamageInflictedPattern);
  if (indirectDamageInflictedMatch) {
    const number = parseInt(indirectDamageInflictedMatch[1]);
    effects.push({
      id: "indirectDamageInflicted",
      rawId: 10003,
      text: "% Indirect Damage Inflicted",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // Range
  const rangePattern = /<div class="ak-title">\n\s+(?:<span.+span> )?(-?\d+) Range(?! to their movement spells)/;
  const rangeMatch = text.match(rangePattern);
  if (rangeMatch) {
    const number = parseInt(rangeMatch[1]);
    effects.push({
      id: "range",
      rawId: 160,
      text: "Range",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // Heals Performed
  const healsPerformedPattern = /<div class="ak-title">\n\s+(-?\d+)% Heals performed/;
  const healsPerformedMatch = text.match(healsPerformedPattern);
  if (healsPerformedMatch) {
    const number = parseInt(healsPerformedMatch[1]);
    effects.push({
      id: "healsPerformed",
      rawId: 10002,
      text: "% Heals Performed",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // Heals Received
  const healsReceivedPattern = /<div class="ak-title">\n\s+(-?\d+)% H?h?eals received/;
  const healsReceivedMatch = text.match(healsReceivedPattern);
  if (healsReceivedMatch) {
    const number = parseInt(healsReceivedMatch[1]);
    effects.push({
      id: "healsReceived",
      rawId: 10005,
      text: "% Heals Received",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // Odd Heals Performed Handling cause of Osa spell
  const osaHealsPerformedPattern = /<div class="ak-title">\n\s+(-?\d+)% D?d?amage inflicted and heals performed/;
  const osaHealsPerformedMatch = text.match(osaHealsPerformedPattern);
  if (osaHealsPerformedMatch) {
    const number = parseInt(osaHealsPerformedMatch[1]);
    effects.push({
      id: "healsPerformed",
      rawId: 10002,
      text: "% Heals Performed",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // Wakfu points
  const wakfuPointsPattern = /<div class="ak-title">\n\s+(?:<span.+span> ?)?(-?\d+) (?:max )?WP/;
  const wakfuPointsMatch = text.match(wakfuPointsPattern);
  if (wakfuPointsMatch) {
    const number = parseInt(wakfuPointsMatch[1]);
    effects.push({
      id: "wakfuPoints",
      rawId: 191,
      text: "Wakfu Points",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // Movement points
  const movementPointsPattern = /<div class="ak-title">\n\s+(?:<span.+span> ?)?(-?\d+) MP(?! for a )/;
  const movementPointsMatch = text.match(movementPointsPattern);
  if (movementPointsMatch) {
    const number = parseInt(movementPointsMatch[1]);
    effects.push({
      id: "movementPoints",
      rawId: 41,
      text: "Movement Points",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // xelor Movement points handling because it has an 'at start of fight' modifier
  const xelorMovementPointsPattern = /<div class="ak-title">\n\s+(?:<span.+span> ?)?(-?\d+) max MP/;
  const xelorMovementPointsMatch = text.match(xelorMovementPointsPattern);
  if (xelorMovementPointsMatch) {
    const number = parseInt(xelorMovementPointsMatch[1]);
    effects.push({
      id: "movementPoints",
      rawId: 41,
      text: "Movement Points",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // Elemental Resistance
  const elementalResistancePattern = /<div class="ak-title">\n\s+(?:<span.+span> ?)?(-?\d+) E?e?lemental R?r?esistance(?! when the Pandawa carries)/;
  const elementalResistanceMatch = text.match(elementalResistancePattern);
  if (elementalResistanceMatch) {
    const number = parseInt(elementalResistanceMatch[1]);
    effects.push({
      id: "elementalResistance",
      rawId: 80,
      text: "Elemental Resistance",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // Force of Will
  const forceOfWillPattern = /<div class="ak-title">\n\s+(?:<span.+span> ?)?(-?\d+) F?f?orce of W?w?ill/;
  const forceOfWillMatch = text.match(forceOfWillPattern);
  if (forceOfWillMatch) {
    const number = parseInt(forceOfWillMatch[1]);
    effects.push({
      id: "forceOfWill",
      rawId: 177,
      text: "Force of Will",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // Control
  const controlPattern = /<div class="ak-title">\n\s+(?:<span.+span> ?)?(-?\d+) C?c?ontrol/;
  const controlMatch = text.match(controlPattern);
  if (controlMatch) {
    const number = parseInt(controlMatch[1]);
    effects.push({
      id: "control",
      rawId: 184,
      text: "Control",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // Distance mastery
  const distanceMasteryPattern = /<div class="ak-title">\n\s+(?:<span.+span> )?(-?\d+) D?d?istance M?m?astery/;
  const distanceMasteryMatch = text.match(distanceMasteryPattern);
  if (distanceMasteryMatch) {
    const number = parseInt(distanceMasteryMatch[1]);
    effects.push({
      id: "distanceMastery",
      rawId: 1053,
      text: "Distance Mastery",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // Dodge
  const dodgePattern = /<div class="ak-title">\n\s+(?:<span.+span> )?(-?\d+) Dodge/;
  const dodgeMatch = text.match(dodgePattern);
  if (dodgeMatch) {
    const number = parseInt(dodgeMatch[1]);
    effects.push({
      id: "dodge",
      rawId: 175,
      text: "Dodge",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // Dodge
  const percentDodgePattern = /<div class="ak-title">\n\s+(?:<span.+span> )?(?:- )?(-?\d+)% Dodge/;
  const percentDodgeMatch = text.match(percentDodgePattern);
  if (percentDodgeMatch) {
    const number = parseInt(percentDodgeMatch[1]);
    effects.push({
      id: "percentDodge",
      rawId: 10012,
      text: "% Dodge",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // Dodge Override
  const dodgeOverridePattern = /<div class="ak-title">\n\s+(?:<span.+span> )?(?:- )?(?:Sets Dodge to (-?\d+) at start of fight|The Cra's Dodge is reduced to (-?\d+))/;
  const dodgeOverrideMatch = text.match(dodgeOverridePattern);
  if (dodgeOverrideMatch) {
    const number = parseInt(dodgeOverrideMatch[1]);
    effects.push({
      id: "dodgeOverride",
      rawId: 10004,
      text: "Dodge Override",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // Health points from level
  const healthPointsFromLevelPattern = /<div class="ak-title">\n\s+(?:<span.+span> )?(?:- )?(-?\d+)(?:% of their level|% of the .+'s level|% of level as HP|% of level as max HP)/;
  const healthPointsFromLevelMatch = text.match(healthPointsFromLevelPattern);
  if (healthPointsFromLevelMatch) {
    const number = parseInt(healthPointsFromLevelMatch[1]);
    effects.push({
      id: "healthPointsFromLevel",
      rawId: 10006,
      text: "Health Points from Level",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // Feca Health points from level, because they have a typo in there
  const fecaHealthPointsFromLevelPattern = /<div class="ak-title">\n\s+(?:<span.+span> )?(?:- )?(-?\d+) of level (?:<span.+span>)/;
  const fecaHealthPointsFromLevelMatch = text.match(fecaHealthPointsFromLevelPattern);
  if (fecaHealthPointsFromLevelMatch) {
    const number = parseInt(fecaHealthPointsFromLevelMatch[1]);
    effects.push({
      id: "healthPointsFromLevel",
      rawId: 10006,
      text: "Health Points from Level",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // Dodge from level
  const dodgeFromLevelPattern = /<div class="ak-title">\n\s+(?:<span.+span> )?(?:- )?Dodge boost: (-?\d+)% of level/;
  const dodgeFromLevelMatch = text.match(dodgeFromLevelPattern);
  if (dodgeFromLevelMatch) {
    const number = parseInt(dodgeFromLevelMatch[1]);
    effects.push({
      id: "dodgeFromLevel",
      rawId: 10010,
      text: "Dodge from Level",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // Lock from level
  const lockFromLevelPattern = /<div class="ak-title">\n\s+(?:<span.+span> )?(?:- )?(-?\d+)% of level as Lock/;
  const lockFromLevelMatch = text.match(lockFromLevelPattern);
  if (lockFromLevelMatch) {
    const number = parseInt(lockFromLevelMatch[1]);
    effects.push({
      id: "lockFromLevel",
      rawId: 10011,
      text: "Lock from Level",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // Lock Override. only used by enripsa atm
  const lockOverridePattern = /<div class="ak-title">\n\s+(?:<span.+span> )?(?:The Eniripsa's Lock goes to (-?\d+) at start of fight|At start of combat, Lock is reduced to (-?\d+))/;
  const lockOverrideMatch = text.match(lockOverridePattern);
  if (lockOverrideMatch) {
    const number = parseInt(lockOverrideMatch[1]);
    effects.push({
      id: "lockOverride",
      rawId: 10007,
      text: "Lock Override",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  // Lock Doubled. only used by masq atm
  const lockDoubledPattern = /<div class="ak-title">\n\s+(?:<span.+span> )?(?:- )?Lock doubled/;
  const lockDoubledMatch = text.match(lockDoubledPattern);
  if (lockDoubledMatch) {
    // const number = parseInt(lockDoubledMatch[1]);
    effects.push({
      id: "lockDoubled",
      rawId: 10009,
      text: "Lock Doubled",
      value: 2,
    });
  }

  // Percent Health Points
  const percentHealthPointsPattern = /<div class="ak-title">\n\s+(?:<span.+span> ?)?(-?\d+)% Health Points/;
  const percentHealthPointsMatch = text.match(percentHealthPointsPattern);
  if (percentHealthPointsMatch) {
    const number = parseInt(percentHealthPointsMatch[1]);
    effects.push({
      id: "percentHealthPoints",
      rawId: 10008,
      text: "% Health Points",
      value: number,
      negative: number < 0 ? true : undefined,
    });
  }

  return effects;
};

// The following skills are passives that have direct stat implications
/*

HANDLED - Feca - Rocky Skin - 30% Block
NOT HANDLING - Feca - Eye for Eye - -50% indirect damage
HANDLED - Feca - Combat Armor - -100% armor received
HANDLED - Feca - The Best Defense is an Attack - 10% damage inflicted
HANDLED - Feca - If You Want Peace, Prepare for War - -100% armor given, 25% damage inflicted
HANDLED - Feca - Line - 1 Range
HANDLED - Feca - Herd Protector - -20% damage inflicted, +300% level HP
HANDLED - Osamodas - Animal Devotion - -25% damage inflicted, -25% heals performed
HANDLED - Osamodas - Animal Sacrifice - 3 WP
HANDLED - Osamodas - Animal Synergy - -20% damage inflicted
NOT HANDLING - Osamodas - Taur Strength - 30% single target damage inflicted, -100% dodge
HANDLED - Osamodas - Summoning Warrior - 20% damage inflicted
HANDLED - Osamodas - Crobak Vision - 2 Range
HANDLED - Osamodas - Animal Sharing - -100 elemental resistance
HANDLED - Enutrof - Treasure Tracker - 30% dodge
HANDLED - Enutrof - Enutrof Force of Will - 20 force of will
HANDLED - Enutrof - Credit Interest - 10% damage inflicted
HANDLED - Sram - Trap Master - 4 Control
HANDLED - Sram - Ambush - 80/320 distance mastery
HANDLED - Sram - Dupery - 10% critical damage inflicted, 20 force of will
HANDLED - Xelor - Violent Omens - 30% indirect damage inflicted
HANDLED - Xelor - Memory - 6 WP, -2 max MP at combat start
HANDLED - Xelor - Assimilation - -6 WP
HANDED - Ecaflip - Heads, I Win - -100% dodge
HANDLED - Eniripsa - Vital Climax - 30% heals received
HANDLED - Eniripsa - All For Me - 800% level HP
HANDLED - Eniripsa - Wind Elixir - -100% lock
HANDLED - Iop - Virility - 350% level HP
HANDLED - Iop - Seismic Rift - 50/200 dodge
HANDLED - Iop - Tormentor - 15% distance damage inflicted
Handled - Cra - Untouchable Scout - 30 force of will, -100% dodge
Handled - Sadida - Knowledge of Dolls - 3 Control
HANDLED - Sadida - Harmless Toxin - 20% heals performed, -10% damage inflicted
HANDLED - Sadida - Venomous - 20 force of will, 50% indirect damage inflicted
HANDLED - Sadida - Common Ground - 50% armor given
HANDLED - Sacrier - Blood Flow - -50% armor received
HANDLED - Sacrier - Sacrier's Heart - -2 Range
HANDLED - Sacrier - Wakfu Pact - 400% level HP
HANDLED - Sacrier - Placidity - -2 WP
HANDLED - Sacrier - Blood Pact - -30% HP
HANDLED - Sacrier - Mobility - -100% lock
HANDLED - Sacrier - Tattooed Blood - 800% level HP
HANDLED - Pandawa - Cocktail - 20% heals performed, -10% damage inflicted
HANDLED - Pandawa - Poisoned Chalice - 15% damage inflicted, -50 elemental resistance
HANDLED - Pandawa - Pandemic - -10% damage inflicted
HANDLED - Masqueraider - Masked Gaze - 1 MP
NOT HANDLING - Masqueraider - Pirouette - 25% side damage inflicted, -25% frontal damage inflicted
HANDLED - Masqueraider - Erosion - -25% damage inflicted
HANDLED - Masqueraider - Brute - 25% damage inflicted, -40% armor given, -40% armor received
HANDLED - Masqueraider - Anchor - +100% lock, -1 MP
HANDLED - Masqueraider - Fancy Footwork - 200% level dodge, -50 elemental resistance
HANDLED - Masqueraider - Debuff Pushes - 10 force of will
HANDLED - Ouginak - Exhaustion - 50% indirect damage inflicted, -2 Range
HANDLED - Ouginak - Cunning Fang - 20% block
HANDLED - Ouginak - Canine Art - -20% indirect damage inflicted
HANDLED - Ouginak - Tailing - 20% rear damage inflicted, 1 MP
HANDLED - Ouginak - Canine Energy - 3 WP
HANDLED - Ouginak - Fury - -1 WP
HANDLED - Ouginak - Raiding - -10% damage inflicted, 30% armor received, 400% level HP
HANDLED - Ouginak - Ardor - -1 MP
HANDLED - Ouginak - Digestion - -20% indirect damage inflicted
HANDLED - Ouginak - Relentless - 20 force of will, -10% damage inflicted
HANDLED - Ouginak - Growlight - 300% level lock
NOT HANDLING - Foggernaut - Advanced Mechanics - 20% direct damage inflicted
HANDLED - Foggernaut - Heavy Duty Covering - 600% level HP
HANDLED - Foggernaut - Light Alloy - -1 MP
HANDLED - Foggernaut - Earthy Assistance - -30% armor received
HANDLED - Foggernaut - Robotic Strategy - -20% indirect damage inflicted
HANDLED - Huppermage - Quadramental Absorption - 20 force of will

*/

///////// End Spell Parsing Logic

const stateData = [];
const stateTranslationData = { en: {}, es: {}, fr: {}, pt: {} };

const getHtmlStatesData = async () => {
  for (let stateIndex in statesEncyclopediaBreakdown) {
    let stateEntry = statesEncyclopediaBreakdown[stateIndex];
    let targetStateDirectory = "statesData/" + stateEntry.definition.id + "/";

    // first we make any missing directories. we assume the /statesData directory already exists.
    if (!fs.existsSync(targetStateDirectory)) {
      fs.mkdir(targetStateDirectory, (error) => {
        if (error) {
          console.log(error);
        }
      });
    }

    let localeKeys = Object.keys(stateTranslationData);
    for (localeIndex in localeKeys) {
      let currentLocale = localeKeys[localeIndex];

      for (let levelCounter = 1; levelCounter < 7; levelCounter++) {
        let baseLinkerUrl = `https://www.wakfu.com/en/linker/state?l=${currentLocale}&id=${stateEntry.definition.id}&level=${levelCounter}`;
        let targetFilePath = targetStateDirectory + currentLocale + "_" + stateEntry.definition.id + "_level_" + levelCounter + ".html";

        let fileExists = await fs.existsSync(targetFilePath);
        if (process.argv.includes("skip-existing") && fileExists) {
          continue;
        }

        // let response = await fetch(baseLinkerUrl, {
        //   headers: {
        //     "x-pjax": "true",
        //     "x-pjax-container": ".ak-spells-panel",
        //     "x-requested-with": "XMLHttpRequest",
        //   },
        // });

        await new Promise((resolve) => setTimeout(resolve, 1000));
        // let response = await fetch(baseLinkerUrl, {
        //   headers: {
        //     accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        //     "accept-language": "en-US,en;q=0.9",
        //     "cache-control": "max-age=0",
        //     priority: "u=0, i",
        //     "sec-ch-ua": '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
        //     "sec-ch-ua-mobile": "?0",
        //     "sec-ch-ua-platform": '"Windows"',
        //     "sec-fetch-dest": "document",
        //     "sec-fetch-mode": "navigate",
        //     "sec-fetch-site": "none",
        //     "sec-fetch-user": "?1",
        //     "upgrade-insecure-requests": "1",
        //     cookie:
        //       'ravelinDeviceId=rjs-1371806b-3cbd-493a-a360-d67618ecc04a; LANG=en; PRIV={"v1":{"fbtr":{"c":"y","ttl":20077},"ggan":{"c":"y","ttl":20077},"otad":{"c":"y","ttl":20077},"fbok":{"c":"y","ttl":20077},"ggpl":{"c":"y","ttl":20077},"twtr":{"c":"y","ttl":20077},"dsrd":{"c":"y","ttl":20077},"pwro":{"c":"y","ttl":20077},"ytbe":{"c":"y","ttl":20077},"twch":{"c":"y","ttl":20077},"gphy":{"c":"y","ttl":20077},"ggmp":{"c":"y","ttl":20077}}}; SID=91b58f23ffe732457cd191c577183b78',
        //   },
        //   referrerPolicy: "strict-origin-when-cross-origin",
        //   body: null,
        //   method: "GET",
        // });

        // let response = await fetch("https://www.wakfu.com/en/linker/state?l=en&id=6711&level=3", {
        //   headers: {
        //     accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        //     "accept-language": "en-US,en;q=0.9",
        //     "cache-control": "max-age=0",
        //     priority: "u=0, i",
        //     "sec-ch-ua": '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
        //     "sec-ch-ua-mobile": "?0",
        //     "sec-ch-ua-platform": '"Windows"',
        //     "sec-fetch-dest": "document",
        //     "sec-fetch-mode": "navigate",
        //     "sec-fetch-site": "none",
        //     "sec-fetch-user": "?1",
        //     "upgrade-insecure-requests": "1",
        //     cookie:
        //       'ravelinDeviceId=rjs-1371806b-3cbd-493a-a360-d67618ecc04a; LANG=en; PRIV={"v1":{"fbtr":{"c":"y","ttl":20077},"ggan":{"c":"y","ttl":20077},"otad":{"c":"y","ttl":20077},"fbok":{"c":"y","ttl":20077},"ggpl":{"c":"y","ttl":20077},"twtr":{"c":"y","ttl":20077},"dsrd":{"c":"y","ttl":20077},"pwro":{"c":"y","ttl":20077},"ytbe":{"c":"y","ttl":20077},"twch":{"c":"y","ttl":20077},"gphy":{"c":"y","ttl":20077},"ggmp":{"c":"y","ttl":20077}}}; SID=91b58f23ffe732457cd191c577183b78',
        //   },
        //   referrerPolicy: "strict-origin-when-cross-origin",
        //   body: null,
        //   method: "GET",
        // });

        const myHeaders = new Headers();
        myHeaders.append("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7");
        myHeaders.append("accept-language", "en-US,en;q=0.9");
        myHeaders.append("cache-control", "max-age=0");
        myHeaders.append(
          "cookie",
          'ravelinDeviceId=rjs-1371806b-3cbd-493a-a360-d67618ecc04a; LANG=en; PRIV={"v1":{"fbtr":{"c":"y","ttl":20077},"ggan":{"c":"y","ttl":20077},"otad":{"c":"y","ttl":20077},"fbok":{"c":"y","ttl":20077},"ggpl":{"c":"y","ttl":20077},"twtr":{"c":"y","ttl":20077},"dsrd":{"c":"y","ttl":20077},"pwro":{"c":"y","ttl":20077},"ytbe":{"c":"y","ttl":20077},"twch":{"c":"y","ttl":20077},"gphy":{"c":"y","ttl":20077},"ggmp":{"c":"y","ttl":20077}}}; SID=91b58f23ffe732457cd191c577183b78; LANG=es'
        );
        myHeaders.append("dnt", "1");
        myHeaders.append("priority", "u=0, i");
        myHeaders.append("sec-ch-ua", '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"');
        myHeaders.append("sec-ch-ua-mobile", "?0");
        myHeaders.append("sec-ch-ua-platform", '"Windows"');
        myHeaders.append("sec-fetch-dest", "document");
        myHeaders.append("sec-fetch-mode", "navigate");
        myHeaders.append("sec-fetch-site", "none");
        myHeaders.append("sec-fetch-user", "?1");
        myHeaders.append("upgrade-insecure-requests", "1");
        myHeaders.append("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36");

        const requestOptions = {
          method: "GET",
          headers: myHeaders,
          redirect: "follow",
        };

        let response = await fetch(baseLinkerUrl, requestOptions);

        let htmlText = await response.text();
        // console.log(htmlText);

        if (htmlText.includes("403 ERROR")) {
          console.log("403 ERROR", baseLinkerUrl);
          continue;
        }

        await fs.writeFile(targetFilePath, htmlText, () => {});
        console.log("wrote", targetFilePath);

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }
};

const processStatesData = async () => {
  let topDirectory = "./statesData/";
  const directoryContents = await fs.promises.readdir(topDirectory);

  for (const entry of directoryContents) {
    const entryPath = path.join(topDirectory, entry);
    const entryStats = await fs.promises.stat(entryPath);

    // let targetClassData = spellData.find((dataEntry) => {
    //   return dataEntry.className.toLocaleLowerCase() === entry;
    // })

    if (entryStats.isDirectory()) {
      await processStateDirectory(entryPath);
    }
  }

  await writeStateDataToFile(stateData);
  await writeStateTranslationDataToFile(stateTranslationData);
};

const processStateDirectory = async (targetDirectory) => {
  const files = await fs.promises.readdir(targetDirectory);

  for (const file of files) {
    const stateId = path.basename(targetDirectory);
    const stateLevel = parseInt(file.match(/level_(\d)/)[1]) - 1;
    const filePath = path.join(targetDirectory, file);

    if (stateLevel <= 0) {
      continue;
    }

    await processStateFile(filePath, stateId, stateLevel);
  }
};

const processStateFile = async (filePath, stateId, stateLevel) => {
  const data = await fs.promises.readFile(filePath, "utf8");
  if (data.includes("403 ERROR")) {
    console.log("403 ERROR");
    // we want to delete the file
    // await fs.promises.unlink(filePath);
    return;
  }

  if (data.length === 0) {
    console.log("Content error with file", filePath);
    // we want to delete the file
    // await fs.promises.unlink(filePath);
    return;
  }

  const { window } = new JSDOM(data);
  let document = window.document;

  // we do this regardless because it also handles translations and I'm too lazy to break that out
  let newStateData = assembleStateData(document, filePath, stateId, stateLevel);

  let existingStateData = stateData.find((state) => state.id === stateId);
  if (existingStateData) {
    // console.log('we found existing state data')
    mergeStateData(existingStateData, newStateData);
  } else {
    // console.log('newSpellData', newSpellData)
    // newSpellData.spellName = spellName;

    // console.log(newStateData)

    // we only push if we have a new entry
    stateData.push(newStateData);
  }
};

const assembleStateData = (document, filePath, stateId, stateLevel) => {
  // console.log(filePath)
  let localeRegex = /\\\d+\\(\w\w)_/;
  const localeMatches = filePath.match(localeRegex);
  let currentLocale = localeMatches[1];

  let newStateData = { id: stateId, descriptionData: [] };

  if (document.querySelector(".ak-name")) {
    stateTranslationData[currentLocale][`${stateId}_name`] = document.querySelector(".ak-name").innerHTML;
  }
  newStateData.name = `${stateId}_name`;

  document.querySelectorAll(".ak-title").forEach((elem, index) => {
    let spaceRegex = /(\s+)/;
    const matches = elem.innerHTML.match(spaceRegex);

    // we can tell if a line is indented by the number of spaces it starts with. 20 spaces is not indented. 24 is indented.
    let spaceCount = matches[0].split(" ").length - 1;

    let lineData = {};
    lineData.indented = spaceCount !== 20;

    // here we handle the image elements and some other cleanup stuff
    let initialText = elem.innerHTML
      .trim()
      .replaceAll('<span class="picto"><img src="http://staticns.ankama.com/wakfu/portal/game/element/b.png"></span>', "")
      .replaceAll('<span class="picto"><img src="http://staticns.ankama.com/wakfu/portal/game/element/PHYSICAL.png"></span>', "{img_physical}")
      .replaceAll('<span class="picto"><img src="http://staticns.ankama.com/wakfu/portal/game/element/ecnbi.png"></span>', "{img_ecnbi}")
      .replaceAll('<span class="picto"><img src="http://staticns.ankama.com/wakfu/portal/game/element/ecnbr.png"></span>', "{img_ecnbr}")
      .replaceAll('<span class="picto"><img src="http://staticns.ankama.com/wakfu/portal/game/element/ally.png"></span>', "{img_ally}")
      .replaceAll('<span class="picto"><img src="http://staticns.ankama.com/wakfu/portal/game/element/enemy.png"></span>', "{img_enemy}")
      .replaceAll('<span class="picto"><img src="http://staticns.ankama.com/wakfu/portal/game/element/LIGHT.png"></span>', "{img_light}")
      .replaceAll('<span class="picto"><img src="http://staticns.ankama.com/wakfu/portal/game/element/CIRCLERING.png"></span>', "{img_circling}")
      .replaceAll('<span class="picto"><img src="http://staticns.ankama.com/wakfu/portal/game/element/FIRE.png"></span>', "{img_fire}")
      .replaceAll('<span class="picto"><img src="http://staticns.ankama.com/wakfu/portal/game/element/EARTH.png"></span>', "{img_earth}")
      .replaceAll('<span class="picto"><img src="http://staticns.ankama.com/wakfu/portal/game/element/WATER.png"></span>', "{img_water}")
      .replaceAll('<span class="picto"><img src="http://staticns.ankama.com/wakfu/portal/game/element/AIR.png"></span>', "{img_air}")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">");

    // Here we need to handle links to other states and whatnot, called 'linkers'
    let deLinkeredText = initialText;
    if (initialText.includes("ak-linker")) {
      let linker = elem.querySelector(".ak-linker");

      let linkerDataRegex = /"linker-query-datas":({"l":"\w\w","id":".+","level":"\d+"})/;
      const linkerMatches = initialText.match(linkerDataRegex);

      lineData.linker = true;
      deLinkeredText = linker.innerHTML;
      lineData.linkerData = JSON.parse(linkerMatches[1]);
      lineData.linkerData.id = lineData.linkerData.id.replaceAll(".", "").replaceAll(",", "");
    } else {
      deLinkeredText = initialText;
    }

    // Here we need to strip out the numbers, store them under keys, and replace the text with those keys for later insertion
    let numberRegex = /(\d+\.\d+|\d+)/g;
    let numberMatches = deLinkeredText.match(numberRegex);
    let denumberedText = deLinkeredText;

    if (denumberedText.includes("for a hit given")) {
      console.log(numberMatches);
    }

    if (numberMatches) {
      for (let numIndex = 0; numIndex < numberMatches.length; numIndex++) {
        lineData[`num_${numIndex}`] = {
          [`level_${stateLevel}`]: parseFloat(numberMatches[numIndex]),
        };

        const targetNumber = numberMatches[numIndex].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(?<!num_)(?<=^|\\s|\\W)${targetNumber}`);

        if (denumberedText.includes("for a hit given")) {
          console.log(regex);
          console.log(denumberedText.match(regex));
        }

        denumberedText = denumberedText.replace(regex, `{num_${numIndex}}`);
      }
    }

    // we need to make sure to escape any | characters
    denumberedText = denumberedText.replaceAll("|", "{'|'}");

    // we finally store the translated text along with its translation ID
    stateTranslationData[currentLocale][`${stateId}_${index}`] = denumberedText;
    lineData.text = `${stateId}_${index}`; // this is a translation ID

    newStateData.descriptionData.push(lineData);

    let newEffectData = parseStateEffectData(deLinkeredText, stateLevel, stateId);

    if (newEffectData) {
      if (newStateData.equipEffects) {
        newStateData.equipEffects.push(newEffectData);
      } else {
        newStateData.equipEffects = [newEffectData];
      }
    } else {
    }
  });

  return newStateData;
};

const parseStateEffectData = (lineText, level, stateId) => {
  // console.log(lineText)
  let statesToSkip = [];

  // Critical Hit Pattern
  // With this we specifically handle Influence (6026), Measure (5075), Theory of Matter (6000),
  // We specifically skip Berserk Critical (6009), Ambition (7115), Vital Influence (7862)
  const infuenceCritPattern = /^(?!^.*at least ).*\b(\d+)% Critical Hit\b$/;
  const infuenceCritMatch = lineText.match(infuenceCritPattern);
  statesToSkip = ["6009", "7115", "7862"];
  if (infuenceCritMatch && !statesToSkip.includes(stateId)) {
    const number = parseInt(infuenceCritMatch[1]);
    let effect = {
      id: "criticalHit",
      rawId: 150,
      values: {
        [level]: number,
      },
      negative: number < 0 ? true : false,
    };
    return effect;
  }

  // AP Pattern
  // With this we specifically handle Carapace (7076)
  const apPattern = /(-?\d) max AP/;
  const apMatch = lineText.match(apPattern);
  statesToSkip = [];
  if (apMatch && !statesToSkip.includes(stateId)) {
    const number = parseInt(apMatch[1]);
    let effect = {
      id: "actionPoints",
      rawId: 31,
      values: {
        [level]: number,
      },
      negative: number < 0 ? true : false,
    };
    return effect;
  }

  // Elemental Resistance Pattern
  // With this we specifically handle Carapace (7076), Assimilation (7258), Positioning Knowledge (5444), Vivacity (6008), Blocking Expert (6037), Rebirth (6712)
  // We specifically skip Walls (2413, 2570), Tenacity (5988), Persistence (6021), Anathar's Pact (7071, 7072, 7073)
  const elementalResistancePattern = /(-?\d+) Elemental Resistance/;
  const elementalResistanceMatch = lineText.match(elementalResistancePattern);
  statesToSkip = ["2413", "2570", "5988", "6021", "7071", "7072", "7073"];
  if (elementalResistanceMatch && !statesToSkip.includes(stateId)) {
    const number = parseInt(elementalResistanceMatch[1]);
    let effect = {
      id: "elementalResistance",
      rawId: 80,
      values: {
        [level]: number,
      },
      negative: number < 0 ? true : false,
    };
    return effect;
  }

  // Force of Will Pattern
  // With this we specifically handle Condemnation (5993), Devastation (5981), Secondary Devastation (6013), Clamor (6033)
  // We specifically skip Inflexible (5073), Wakfu Pact (5370), Resolute (5990), Lightness (5991), Obstinacy (6022), Poise (6023), Cyclothymia (6030), Iron Will (7881)
  const forceOfWillPattern = /(-?\d+) Force of Will/;
  const forceOfWillMatch = lineText.match(forceOfWillPattern);
  statesToSkip = ["5073", "5370", "5990", "5991", "6022", "6023", "6030", "7881"];
  if (forceOfWillMatch && !statesToSkip.includes(stateId)) {
    const number = parseInt(forceOfWillMatch[1]);
    let effect = {
      id: "forceOfWill",
      rawId: 177,
      values: {
        [level]: number,
      },
      negative: number < 0 ? true : false,
    };
    return effect;
  }

  // Indirect Damage Pattern
  // With this we specifically handle Ruin (5980), Determination (5987)
  // We specifically skip Cyclical Ruin (6011)
  const indirectDamagePattern = /(-?\d+)% indirect Damage/;
  const indirectDamageMatch = lineText.match(indirectDamagePattern);
  statesToSkip = ["6011"];
  if (indirectDamageMatch && !statesToSkip.includes(stateId)) {
    const number = parseInt(indirectDamageMatch[1]);
    let effect = {
      id: "indirectDamageInflicted",
      rawId: 10003,
      values: {
        [level]: number,
      },
      negative: number < 0 ? true : false,
    };
    return effect;
  }

  // Heals Performed Pattern
  // With this we specifically handle Secret of Life (6330), Reinvigoration (6926), Accumulation (7719)
  // We specifically skip Precise (5076), Altruism (6828), Natural (6830), Firm Foot (6833), Anathar's Pact III (7071), Delay (7078), Lunatic (7254), Sentinel (7257), Engagement (7880)
  const healsPerformedPattern = /(-?\d+)% Heals performed/;
  const healsPerformedMatch = lineText.match(healsPerformedPattern);
  statesToSkip = ["5076", "6828", "6830", "6833", "7071", "7078", "7254", "7257", "7880"];
  if (healsPerformedMatch && !statesToSkip.includes(stateId)) {
    const number = parseInt(healsPerformedMatch[1]);
    let effect = {
      id: "healsPerformed",
      rawId: 10002,
      values: {
        [level]: number,
      },
      negative: number < 0 ? true : false,
    };
    return effect;
  }

  // Armor Given Pattern
  // With this we specifically handle Secret of Rocky Envelope (6038)
  // We specifically skip Precise (5076), Longevity (6709), Armor Length (6827), Abandon (6932), Anathar's Pact III (7071), Allocentrism (8131)
  const armorGivenPattern = /(-?\d+)% Armor given/;
  const armorGivenMatch = lineText.match(armorGivenPattern);
  statesToSkip = ["5076", "6709", "6827", "6932", "7071", "8131"];
  if (armorGivenMatch && !statesToSkip.includes(stateId)) {
    const number = parseInt(armorGivenMatch[1]);
    let effect = {
      id: "armorGiven",
      rawId: 10000,
      values: {
        [level]: number,
      },
      negative: number < 0 ? true : false,
    };
    return effect;
  }

  // % Level As Lock Pattern
  // With this we specifically handle Secret of Brawling (7075), Interception (7865)
  // We specifically skip Herculean Strength (5448), Berserk Lock (6012), Outrage (6705)
  const levelAsLockPattern = /(-?\d+)% of level as Lock/;
  const levelAsLockMatch = lineText.match(levelAsLockPattern);
  statesToSkip = ["5448", "6012", "6705"];
  if (levelAsLockMatch && !statesToSkip.includes(stateId)) {
    const number = parseInt(levelAsLockMatch[1]);
    let effect = {
      id: "lockFromLevel",
      rawId: 10011,
      values: {
        [level]: number,
      },
      negative: number < 0 ? true : false,
    };
    return effect;
  }

  // Damage Inflicted Pattern
  // With this we specifically handle Secret of Excess (5250), Frenzy (5994), Theory of Matter (6000), Swiftness (6005), Fury (6027), Focalization (6034), Heavy Armor (7077), Excess II (7252)
  // We specifically skip Ambush (5985), Distant Ambush (6016), Length (6036), Blocking Expert (6037), Lone Wolf (6329), Lock Steal (6817), Dodge Steal (6818), Social Relations (6823), Destruction (6825), Sensitivity (6826), Last Breath (6831), Delay (7078), Locking (7081), Featherweight (7088), Lunatic (7254), Art of Concealment (7711), Madness (7712), Bashell (7713), Light Strength (7859), Sparkle (7870), Embellishment (8132)
  const damageInflictedPattern = /(-?\d+)% Damage/;
  const damageInflictedMatch = lineText.match(damageInflictedPattern);
  statesToSkip = ["5985", "6016", "6036", "6037", "6329", "6817", "6818", "6823", "6825", "6826", "6831", "7078", "7081", "7088", "7254", "7711", "7712", "7713", "7859", "7870", "8132"];
  if (damageInflictedMatch && !statesToSkip.includes(stateId)) {
    const number = parseInt(damageInflictedMatch[1]);
    let effect = {
      id: "damageInflicted",
      rawId: 1,
      values: {
        [level]: number,
      },
      negative: number < 0 ? true : false,
    };
    return effect;
  }

  return null;
};

const mergeStateData = (existingData, newData) => {
  // we need to merge the numerical values if the levels differ
  // but we don't store the level...
  // might have to use object for the values after all, at least initially
  existingData.descriptionData.forEach((lineData, lineIndex) => {
    if (newData.descriptionData[lineIndex]) {
      for (let numIndex = 0; numIndex < 5; numIndex++) {
        if (lineData[`num_${numIndex}`]) {
          lineData[`num_${numIndex}`] = { ...lineData[`num_${numIndex}`], ...newData.descriptionData[lineIndex][`num_${numIndex}`] };
        }
      }
    } else {
      console.log("a line that doesnt exist??? uh oh");
    }
  });

  if (newData.equipEffects) {
    // console.log(existingData.equipEffects, newData.equipEffects)
    // if the new data has equip effects
    newData.equipEffects.forEach((newEffectData) => {
      // we first want to see if it already exist in the existing data
      if (existingData.equipEffects === undefined) {
        existingData.equipEffects = [];
      }

      let existingEffectData = existingData.equipEffects.find((effect) => effect.rawId === newEffectData.rawId);

      if (existingEffectData) {
        // if we have an existing effect, we want to marge them
        let levelToAdd = Object.keys(newEffectData.values)[0];
        existingEffectData.values[levelToAdd] = newEffectData.values[levelToAdd];
      } else {
        // otherwise we add it flat out
        console.log("pushing new effect", newEffectData);
        existingData.equipEffects.push(newEffectData);
      }
    });
  }
};

const writeStateDataToFile = (jsonData) => {
  let jsonFilePath = "state_data.json";
  fs.writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2), (err) => {
    if (err) {
      console.error("Error writing JSON to file:", err);
    } else {
      console.log("JSON data has been written to", jsonFilePath);
    }
  });
};

const writeStateTranslationDataToFile = (jsonData) => {
  Object.keys(jsonData).forEach((localeKey) => {
    let jsonFilePath = `${localeKey}_states.json`;
    fs.writeFile(jsonFilePath, JSON.stringify(jsonData[localeKey], null, 2), (err) => {
      if (err) {
        console.error("Error writing JSON to file:", err);
      } else {
        console.log("JSON data has been written to", jsonFilePath);
      }
    });
  });
};

// getHtmlSpellData(); // actually does the scraping
// assembleSpellDefData(); // outputs the massive const we have up there into a usable format
// processSpellData();

getHtmlStatesData();
// processStatesData();
