const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'Demo123!'; // Demo şifresi
  const hash = await bcrypt.hash(password, 10);
  console.log('\n🔐 Password Hash Generated:');
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log("\nBu hash'i seed-db.js dosyasına kopyalayın.\n");
}

generateHash();
