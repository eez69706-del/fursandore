const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

// إنشاء المجلد إذا لم يكن موجود
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

const defaultData = {
  teams: [],
  tournament: null,
  history: [],
  liveMatches: {},
  settings: {
    schoolName: 'مدارس الفرسان',
    tournamentName: 'بطولة الأبطال',
    adminPassword: 'fursan2025'
  }
};

function load() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      return { ...defaultData, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('DB load error:', e.message);
  }
  return { ...defaultData };
}

let data = load();

function save() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('DB save error:', e.message);
  }
}

// حفظ تلقائي كل 10 ثواني
setInterval(save, 10000);

module.exports = {
  get: () => data,
  set: (newData) => { data = { ...data, ...newData }; save(); },
  save,
  getSetting: (key) => data.settings?.[key],
  setSetting: (key, value) => {
    if (!data.settings) data.settings = {};
    data.settings[key] = value;
    save();
  }
};