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
      processDirectory(entryPath, targetClassData);
    }
  }
};

processData();

const processDirectory = async (targetDirectory, targetClassData) => {
  const files = await fs.promises.readdir(targetDirectory);

  for (const file of files) {
    const className = path.basename(targetDirectory);
    const filePath = path.join(targetDirectory, file);
    
    await processFile(filePath, targetClassData);
  }

  // console.log(targetClassData)
  await writeSpellDataToFile(spellData);
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
      //   console.log('JSON data has been written to', jsonFilePath);
    }
  });
};

const assembleSpellData = (document, filePath) => {
  let newSpellData = {};
  console.log('trying to process', filePath)

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
  const blockPattern = /<div class=\\"ak-title\\">\\n\s+(\d+)% Block/;
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

  return effects;
}