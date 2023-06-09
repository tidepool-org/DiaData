const fs = require('fs');
const { DateTime } = require('luxon');
const { faker } = require('@faker-js/faker');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const { days } = yargs(hideBin(process.argv))
  .options({
    days: {
      alias: 'd',
      describe: 'Number of days',
      type: 'number',
      demandOption: true,
    },
  })
  .check((argv) => {
    if (argv.days > 0 && argv.days <= 120) {
      return true;
    }
    throw new Error('days must be > 0 and < 120');
  }).argv;

const dataset = [];
const totalDays = days + 1;
let date = DateTime.now().startOf('day').minus({ days: totalDays });
let bg = faker.datatype.number({ min: 100, max: 300, precision: 0.0001 });
let carbs = 0;
let iob = 0;

function generateCarbsAndIob(currentBg) {
  if (currentBg > 70 && bg < 200) {
    carbs = faker.datatype.number({ min: 10, max: 80, precision: 1 });
    iob = Math.round(carbs / 15);
  } else if (currentBg <= 70) {
    carbs = faker.datatype.number({ min: 20, max: 80, precision: 1 });
    iob = 0;
  } else {
    carbs = faker.datatype.number({ min: 10, max: 60, precision: 1 });
    iob = Math.round(carbs / 15);
  }
  return [carbs, iob];
}

// Clamp bg between 55 and 300 and reset carbs and iob if needed
function clampBgAndResetCarbsAndIob(currentBg) {
  if (currentBg >= 300) {
    bg = 300;
    carbs = 0;
    iob += 1;
  } else if (currentBg <= 55) {
    bg = 53;
    carbs = 20;
    iob = 0;
  }
  return [bg, carbs, iob];
}

// Loop to create enough SMBG data for the desired days
for (let i = 0; i < totalDays * 8 && date < DateTime.now().minus({ hours: 6, minutes: 30 }); i++) {
  // Add a random number of hours and minutes to the date
  date = date.plus(
    {
      hours: faker.datatype.number(
        {
          min: 3, max: 6, precision: 1,
        },
      ),
      minutes: faker.datatype.number(
        {
          min: 0, max: 30, precision: 1,
        },
      ),
    },
  );

  // Update bg based on carbs and iob
  bg = bg + (carbs / 15) * 50 - (iob * 43);

  // Clamp bg and reset carbs and iob using the function defined earlier
  [bg, carbs, iob] = clampBgAndResetCarbsAndIob(bg);

  // Generate data for datum object
  const smbgDatum = {
    deviceId: 'OneTouchUltra2-JNGZ162-T0111',
    type: 'smbg',
    units: 'mg/dl',
    time: date.toFormat("yyyy-MM-dd'T'HH:mm:ss'Z'"),
    value: bg,
  };

  // Push datum object to the dataset array
  dataset.push(smbgDatum);

  // Generate a random number of carbs and iob every eight hours using the function defined earlier
  if (i % (24 / 8) === 0) {
    [carbs, iob] = generateCarbsAndIob(bg);
  } else {
    // Reduce carbs and iob by a factor every hour
    carbs *= 0.3;
    iob *= 0.7;
  }
}

// Create a folder called "results" using fs.mkdir
fs.mkdir('results', { recursive: true }, (mkdirErr) => {
  if (mkdirErr) {
    console.error(mkdirErr);
    return;
  }
  fs.writeFile(`results/smbg_data_${days}days.json`, JSON.stringify(dataset), (writeFileErr) => {
    if (writeFileErr) {
      console.error(writeFileErr);
      return;
    }
    console.log('Data Generated');
  });
});
