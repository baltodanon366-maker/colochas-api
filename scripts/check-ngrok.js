/**
 * Script para verificar si ngrok está instalado
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function checkNgrok() {
  try {
    const { stdout } = await execAsync('ngrok version', { timeout: 5000 });
    console.log('✅ Ngrok está instalado');
    console.log(stdout);
    return true;
  } catch (error) {
    console.error('❌ Ngrok NO está instalado o no está en el PATH');
    console.error('\n📥 Para instalar ngrok:');
    console.error('   1. Descarga de: https://ngrok.com/download');
    console.error('   2. Extrae ngrok.exe a una carpeta');
    console.error('   3. Agrega esa carpeta al PATH de Windows');
    console.error('   4. Cierra y reabre la terminal');
    console.error('\n   O ver: INSTALAR_NGROK.md para más detalles\n');
    return false;
  }
}

checkNgrok().then(installed => {
  process.exit(installed ? 0 : 1);
});

