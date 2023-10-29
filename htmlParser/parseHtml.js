// So the theory here is that we iterate over all html blocks and parse out the data we want
const fs = require('fs');
const path = require('path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

let topDirectory = './spellData/';
const spellData = [
  { className: 'Feca', classId: 1, spells: [] },
  { className: 'Osamodas', classId: 2, spells: [] },
  { className: 'Enutrof', classId: 3, spells: [] },
  { className: 'Sram', classId: 4, spells: [] },
  { className: 'Xelor', classId: 5, spells: [] },
  { className: 'Ecaflip', classId: 6, spells: [] },
  { className: 'Eniripsa', classId: 7, spells: [] },
  { className: 'Iop', classId: 8, spells: [] },
  { className: 'Cra', classId: 9, spells: [] },
  { className: 'Sadida', classId: 10, spells: [] },
  { className: 'Sacrieur', classId: 11, spells: [] },
  { className: 'Pandawa', classId: 12, spells: [] },
  { className: 'Rogue', classId: 13, spells: [] },
  { className: 'Masqueraider', classId: 14, spells: [] },
  { className: 'Ouginak', classId: 15, spells: [] },
  { className: 'Foggernaut', classId: 16, spells: [] },
  { className: 'Eliotrope', classId: 18, spells: [] },
  { className: 'Huppermage', classId: 19, spells: [] },
];

const processData = async () => {
  const directoryContents = await fs.promises.readdir(topDirectory);

  for (const entry of directoryContents) {
    const entryPath = path.join(topDirectory, entry);
    const entryStats = await fs.promises.stat(entryPath);

    let targetClassData = spellData.find((dataEntry) => {
      return dataEntry.className.toLocaleLowerCase() === entry;
    })

    if (entryStats.isDirectory()) {
      await processDirectory(entryPath, targetClassData);
    }
  }

  await writeSpellDataToFile(spellData);
};

processData();

const processDirectory = async (targetDirectory, targetClassData) => {
  const files = await fs.promises.readdir(targetDirectory);

  for (const file of files) {
    const className = path.basename(targetDirectory);
    const filePath = path.join(targetDirectory, file);
    
    await processFile(filePath, targetClassData);
  }
};

const processFile = async (filePath, targetClassData) => {
  const data = await fs.promises.readFile(filePath, 'utf8');

  const { window } = new JSDOM(data);
  let document = window.document;

  let newSpellData = assembleSpellData(document, filePath);
  // console.log('newSpellData', newSpellData)
  // newSpellData.spellName = spellName;

  targetClassData.spells.push(newSpellData);
};

const writeSpellDataToFile = (jsonData) => {
  let jsonFilePath = 'spell_data.json';
  fs.writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2), (err) => {
    if (err) {
      console.error('Error writing JSON to file:', err);
    } else {
      console.log('JSON data has been written to', jsonFilePath);
    }
  });
};

const assembleSpellData = (document, filePath) => {
  let newSpellData = {};
  // console.log('trying to process', filePath)

  const parentDirectory = path.dirname(filePath);
  const className = path.basename(parentDirectory);

  newSpellData.class = className;

  newSpellData.name = getSpellName(document);
  newSpellData.id = getSpellId(document, newSpellData);
  newSpellData.description = getSpellDescription(document);
  newSpellData.iconId = newSpellData.id;
  newSpellData.normalEffects = getNormalSpellEffects(document);

  return newSpellData;
};

// Individual field parsers
const getSpellName = (document) => {
  let parentElement = document.querySelector('.ak-spell-name');
  const textNodes = Array.from(parentElement.childNodes)
    .filter((node) => node.nodeType === 3)
    .map((node) => node.textContent)
    .join('');

  return textNodes.trim();
};

const getSpellId = (document, newSpellData) => {
  let imageElem = document.querySelector(`img[alt="${newSpellData.name}"][title="${newSpellData.name}"]`);

  const regexPattern = /\/(\d+)\.png/;
  const matches = imageElem.src.match(regexPattern);
  const extractedId = matches[1];

  return extractedId;
};

const getSpellDescription = (document) => {
  let parentElement = document.querySelector('.ak-spell-description');
  let text = parentElement.textContent;

  return text.trim();
};

const getNormalSpellEffects = (document) => {
  let normalEffects = {};
  let previousEntry = null;

  const h2Elements = document.querySelectorAll('h2');
  for (const h2 of h2Elements) {
    if (h2.textContent === 'Normal effects') {
      // This is the h2 element with the text 'Normal effects'
      const parent = h2.parentElement;

      let htmlElem = parent.querySelector('.ak-container');
      let htmlText = htmlElem.outerHTML.replaceAll(/data-hasqtip=[\"\\\d\w\_\,]+\"/gi, '');

      if (previousEntry && previousEntry.html === htmlText) {
        continue;
      }

      let levelWrapper = parent.closest('.ak-level-selector-target');
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
      id: 'percentBlock',
      rawId: 875,
      text: '% Block',
      value: number,
    })
  }

  // Armor Received
  const armorReceivedPattern = /<div class="ak-title">\n\s+(-?\d+)% Armor received/;
  const armorReceivedMatch = text.match(armorReceivedPattern);  
  if (armorReceivedMatch) {
    const number = parseInt(armorReceivedMatch[1]);
    effects.push({
      id: 'armorReceived',
      rawId: 10001,
      text: '% Armor Received',
      value: number,
      negative: number < 0 ? true : undefined,
    })
  }

  // Armor Given
  const armorGivenPattern = /<div class="ak-title">\n\s+(-?\d+)% Armor given/;
  const armorGivenMatch = text.match(armorGivenPattern);  
  if (armorGivenMatch) {
    const number = parseInt(armorGivenMatch[1]);
    effects.push({
      id: 'armorGiven',
      rawId: 10000,
      text: '% Armor Given',
      value: number,
      negative: number < 0 ? true : undefined,
    })
  }

  // Damage Inflicted
  const damageInflictedPattern = /<div class="ak-title">\n\s+(?:<span.+span> )?(-?\d+)% D?d?amage inflicted/;
  const damageInflictedMatch = text.match(damageInflictedPattern);  
  if (damageInflictedMatch) {
    const number = parseInt(damageInflictedMatch[1]);
    effects.push({
      id: 'damageInflicted',
      rawId: 1,
      text: '% Damage Inflicted',
      value: number,
      negative: number < 0 ? true : undefined,
    })
  }

  // Damage Inflicted
  const indirectDamageInflictedPattern = /<div class="ak-title">\n\s+(?:<span.+span> )?(-?\d+)% I?i?ndirect D?d?amage I?i?nflicted/;
  const indirectDamageInflictedMatch = text.match(indirectDamageInflictedPattern);  
  if (indirectDamageInflictedMatch) {
    const number = parseInt(indirectDamageInflictedMatch[1]);
    effects.push({
      id: 'indirectDamageInflicted',
      rawId: 10003,
      text: '% Indirect Damage Inflicted',
      value: number,
      negative: number < 0 ? true : undefined,
    })
  }

  // Range
  const rangePattern = /<div class="ak-title">\n\s+(?:<span.+span> )?(-?\d+) Range/;
  const rangeMatch = text.match(rangePattern);  
  if (rangeMatch) {
    const number = parseInt(rangeMatch[1]);
    effects.push({
      id: 'range',
      rawId: 160,
      text: 'Range',
      value: number,
      negative: number < 0 ? true : undefined,
    })
  }

  // Heals Performed
  const healsPerformedPattern = /<div class="ak-title">\n\s+(-?\d+)% Heals performed/;
  const healsPerformedMatch = text.match(healsPerformedPattern);  
  if (healsPerformedMatch) {
    const number = parseInt(healsPerformedMatch[1]);
    effects.push({
      id: 'healsPerformed',
      rawId: 10002,
      text: '% Heals Performed',
      value: number,
      negative: number < 0 ? true : undefined,
    })
  }

  // Heals Received
  const healsReceivedPattern = /<div class="ak-title">\n\s+(-?\d+)% H?h?eals received/;
  const healsReceivedMatch = text.match(healsReceivedPattern);  
  if (healsReceivedMatch) {
    const number = parseInt(healsReceivedMatch[1]);
    effects.push({
      id: 'healsReceived',
      rawId: 10005,
      text: '% Heals Received',
      value: number,
      negative: number < 0 ? true : undefined,
    })
  }

  // Odd Heals Performed Handling cause of Osa spell
  const osaHealsPerformedPattern = /<div class="ak-title">\n\s+(-?\d+)% D?d?amage inflicted and heals performed/;
  const osaHealsPerformedMatch = text.match(osaHealsPerformedPattern);  
  if (osaHealsPerformedMatch) {
    const number = parseInt(osaHealsPerformedMatch[1]);
    effects.push({
      id: 'healsPerformed',
      rawId: 10002,
      text: '% Heals Performed',
      value: number,
      negative: number < 0 ? true : undefined,
    })
  }

  // Wakfu points
  const wakfuPointsPattern = /<div class="ak-title">\n\s+(?:<span.+span> ?)?(-?\d+) (?:max )?WP/;
  const wakfuPointsMatch = text.match(wakfuPointsPattern);  
  if (wakfuPointsMatch) {
    const number = parseInt(wakfuPointsMatch[1]);
    effects.push({
      id: 'wakfuPoints',
      rawId: 191,
      text: 'Wakfu Points',
      value: number,
      negative: number < 0 ? true : undefined,
    })
  }

  // Movement points
  const movementPointsPattern = /<div class="ak-title">\n\s+(?:<span.+span> ?)?(-?\d+) MP/;
  const movementPointsMatch = text.match(movementPointsPattern);  
  if (movementPointsMatch) {
    const number = parseInt(movementPointsMatch[1]);
    effects.push({
      id: 'movementPoints',
      rawId: 191,
      text: 'Movement Points',
      value: number,
      negative: number < 0 ? true : undefined,
    })
  }

  // xelor Movement points handling because it has an 'at start of fight' modifier
  const xelorMovementPointsPattern = /<div class="ak-title">\n\s+(?:<span.+span> ?)?(-?\d+) max MP/;
  const xelorMovementPointsMatch = text.match(xelorMovementPointsPattern);  
  if (xelorMovementPointsMatch) {
    const number = parseInt(xelorMovementPointsMatch[1]);
    effects.push({
      id: 'movementPoints',
      rawId: 191,
      text: 'Movement Points',
      value: number,
      negative: number < 0 ? true : undefined,
    })
  }

  // Elemental Resistance
  const elementalResistancePattern = /<div class="ak-title">\n\s+(?:<span.+span> ?)?(-?\d+) E?e?lemental R?r?esistance/;
  const elementalResistanceMatch = text.match(elementalResistancePattern);  
  if (elementalResistanceMatch) {
    const number = parseInt(elementalResistanceMatch[1]);
    effects.push({
      id: number < 0 ? 'elementalResistanceReduction' : 'elementalResistance',
      rawId: number < 0 ? 90 : 80,
      text: 'Elemental Resistance',
      value: number,
      negative: number < 0 ? true : undefined,
    })
  }

  // Force of Will
  const forceOfWillPattern = /<div class="ak-title">\n\s+(?:<span.+span> ?)?(-?\d+) F?f?orce of W?w?ill/;
  const forceOfWillMatch = text.match(forceOfWillPattern);  
  if (forceOfWillMatch) {
    const number = parseInt(forceOfWillMatch[1]);
    effects.push({
      id: 'forceOfWill',
      rawId: 177,
      text: 'Force of Will',
      value: number,
      negative: number < 0 ? true : undefined,
    })
  }

  // Control
  const controlPattern = /<div class="ak-title">\n\s+(?:<span.+span> ?)?(-?\d+) C?c?ontrol/;
  const controlMatch = text.match(controlPattern);  
  if (controlMatch) {
    const number = parseInt(controlMatch[1]);
    effects.push({
      id: 'control',
      rawId: 184,
      text: 'Control',
      value: number,
      negative: number < 0 ? true : undefined,
    })
  }

  // Distance mastery
  const distanceMasteryPattern = /<div class="ak-title">\n\s+(?:<span.+span> )?(-?\d+) D?d?istance M?m?astery/;
  const distanceMasteryMatch = text.match(distanceMasteryPattern);  
  if (distanceMasteryMatch) {
    const number = parseInt(distanceMasteryMatch[1]);
    effects.push({
      id: 'distanceMastery',
      rawId: 1053,
      text: 'Distance Mastery',
      value: number,
      negative: number < 0 ? true : undefined,
    })
  }

  // Dodge Override
  const dodgeOverridePattern = /<div class="ak-title">\n\s+(?:<span.+span> )?Sets Dodge to (-?\d+) at start of fight/;
  const dodgeOverrideMatch = text.match(dodgeOverridePattern);  
  if (dodgeOverrideMatch) {
    const number = parseInt(dodgeOverrideMatch[1]);
    effects.push({
      id: 'dodgeOverride',
      rawId: 10004,
      text: 'Dodge Override',
      value: number,
      negative: number < 0 ? true : undefined,
    })
  }

  // Health points from level
  const healthPointsFromLevelPattern = /<div class="ak-title">\n\s+(?:<span.+span> )?(?:- )?(-?\d+)% of their level/;
  const healthPointsFromLevelMatch = text.match(healthPointsFromLevelPattern);  
  if (healthPointsFromLevelMatch) {
    const number = parseInt(healthPointsFromLevelMatch[1]);
    effects.push({
      id: 'healthPointsFromLevel',
      rawId: 10006,
      text: 'Health Points from Level',
      value: number,
      negative: number < 0 ? true : undefined,
    })
  }

  // Lock Override. only used by enripsa atm
  const lockOverridePattern = /<div class="ak-title">\n\s+(?:<span.+span> )?The Eniripsa's Lock goes to (-?\d+) at start of fight/;
  const lockOverrideMatch = text.match(lockOverridePattern);  
  if (lockOverrideMatch) {
    const number = parseInt(lockOverrideMatch[1]);
    effects.push({
      id: 'lockOverride',
      rawId: 10007,
      text: 'Lock Override',
      value: number,
      negative: number < 0 ? true : undefined,
    })
  }

  return effects;
}

// The following skills are passives that have direct stat implications
/*

HANDLED - Feca - Rocky Skin - 30% Block
???????????Feca - Eye for Eye - -50% indirect damage
HANDLED - Feca - Combat Armor - -100% armor received
HANDLED - Feca - The Best Defense is an Attack - 10% damage inflicted
HANDLED - Feca - If You Want Peace, Prepare for War - -100% armor given, 25% damage inflicted
HANDLED - Feca - Line - 1 Range
???????????Feca - Herd Protector - -20% damage inflicted, +300% level HP
HANDLED - Osamodas - Animal Devotion - -25% damage inflicted, -25% heals performed
HANDLED - Osamodas - Animal Sacrifice - 3 WP
HANDLED - Osamodas - Animal Synergy - -20% damage inflicted
NOT HANDLING - Osamodas - Taur Strength - 30% single target damage inflicted, -100% dodge
HANDLED - Osamodas - Summoning Warrior - 20% damage inflicted
HANDLED - Osamodas - Crobak Vision - 2 Range
HANDLED - Osamodas - Animal Sharing - -100 elemental resistance
NOT HANDLING = Enutrof - Treasure Tracker - 30% dodge
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
Iop - Virility - 350% level HP
Iop - Seismic Rift - 50/200 dodge
Iop - Tormentor - 15% distance damage inflicted
Cra - Untouchable Scout - 30 force of will, -100% dodge
Sadida - Knowledge of Dolls - 3 Control
Sadida - Harmless Toxin - 20% heals performed, -10% damage inflicted
Sadida - Venomous - 20 force of will, 50% indirect damage inflicted
Sadida - Common Ground - 50% armor given
Sacrier - Blood Flow - -50% armor received
Sacrier - Sacrier's Heart - -2 Range
Sacrier - Wakfu Pact - 400% level HP
Sacrier - Placidity - -2 WP
Sacrier - Blood Pact - -30% HP
Sacrier - Mobility - -100% lock
Sacrier - Tattooed Blood - 800% level HP
Pandawa - Cocktail - 20% heals performed, -10% damage inflicted
Pandawa - Poisoned Chalice - 15% damage inflicted, -50 elemental resistance
Pandawa - Pandemic - -10% damage inflicted
Masqueraider - Masked Gaze - 1 MP
Masqueraider - Pirouette - 25% side damage inflicted, -25% frontal damage inflicted
Masqueraider - Erosion - 25% damage inflicted
Masqueraider - Brute - 25% damage inflicted, -40% armor given, -40% armor received
Masqueraider - Anchor - +100% lock, -1 MP
Masqueraider - Fancy Footwork - 200% level dodge, -50 elemental resistance
Masqueraider - Debuff Pushes - 10 force of will
Ouginak - Exhaustion - 50% indirect damage inflicted, -2 Range
Ouginak - Cunning Fang - 20% block
Ouginak - Canine Art - -20% indirect damage inflicted
Ouginak - Tailing - 20% rear damage inflicted, 1 MP
Ouginak - Canine Energy - 3 WP
Ouginak - Fury - -1 WP
Ouginak - Raiding - -10% damage inflicted, 30% armor received, 400% level HP
Ouginak - Ardor - -1 MP
Ouginak - Digestion - -20% indirect damage inflicted
Ouginak - Relentless - 20 force of will, -10% damage inflicted
Ougnak - Growlight - 300% level lock
Foggernaut - Advanced Mechanics - 20% direct damage inflicted
Foggernaut - Heavy Duty Covering - 600% level HP
Foggernaut - Light Alloy - -1 MP
Foggernaut - Earthy Assistance - -30% armor received
Foggernaut - Robotic Strategy - -20% indirect damage inflicted
Huppermage - Quadramental Absorption - 20 force of will

*/