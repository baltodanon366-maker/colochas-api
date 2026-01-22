/**
 * Script para iniciar la API con ngrok automáticamente
 * 
 * Uso:
 *   npm run start:ngrok
 * 
 * Requisitos:
 *   - ngrok instalado (choco install ngrok o descargar de ngrok.com)
 *   - API corriendo en puerto 3000
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const NGROK_CONFIG_PATH = path.join(__dirname, '../ngrok-config.yml');

console.log('🚀 Iniciando API con ngrok...\n');

// Iniciar la API en modo desarrollo
console.log('📦 Iniciando servidor NestJS...');
const nestProcess = spawn('npm', ['run', 'start:dev'], {
  stdio: 'inherit',
  shell: true,
});

// Esperar un poco para que la API inicie
setTimeout(() => {
  console.log('\n🌐 Iniciando túnel ngrok...');
  console.log(`   Puerto local: ${PORT}`);
  console.log('   Espera a que aparezca la URL pública de ngrok\n');
  
  // Iniciar ngrok
  const ngrokArgs = ['http', PORT.toString()];
  
  // Si existe un archivo de configuración, usarlo
  if (fs.existsSync(NGROK_CONFIG_PATH)) {
    ngrokArgs.push('--config', NGROK_CONFIG_PATH);
  }
  
  const ngrokProcess = spawn('ngrok', ngrokArgs, {
    stdio: 'inherit',
    shell: true,
  });

  // Manejar cierre de procesos
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Cerrando procesos...');
    nestProcess.kill();
    ngrokProcess.kill();
    process.exit(0);
  });

  ngrokProcess.on('error', (error) => {
    if (error.code === 'ENOENT') {
      console.error('\n❌ Error: ngrok no está instalado o no está en el PATH');
      console.error('\n📥 Opciones para instalar ngrok:');
      console.error('   1. Con Chocolatey: choco install ngrok');
      console.error('   2. Descarga manual: https://ngrok.com/download');
      console.error('   3. O usa el método manual: npm run start:dev (en una terminal)');
      console.error('      y luego: ngrok http 3000 (en otra terminal)');
      console.error('\n💡 La API seguirá corriendo en http://localhost:3000');
      console.error('   Puedes iniciar ngrok manualmente cuando lo instales.\n');
      // No matamos el proceso de NestJS, solo ngrok falló
      return;
    } else {
      console.error('\n❌ Error al iniciar ngrok:', error.message || error);
      console.error('\n💡 Si es un error de autenticación:');
      console.error('   1. Crea cuenta en: https://dashboard.ngrok.com/signup');
      console.error('   2. Obtén token en: https://dashboard.ngrok.com/get-started/your-authtoken');
      console.error('   3. Ejecuta: ngrok config add-authtoken TU_TOKEN');
      console.error('\n   Ver: CONFIGURAR_NGROK_TOKEN.md para más detalles\n');
      // No matamos el proceso de NestJS
      return;
    }
  });

  // Capturar salida de ngrok para detectar errores de autenticación
  ngrokProcess.stderr?.on('data', (data) => {
    const output = data.toString();
    if (output.includes('authentication failed') || output.includes('authtoken')) {
      console.error('\n❌ Error de autenticación de ngrok');
      console.error('\n🔐 Necesitas configurar tu authtoken:');
      console.error('   1. Ve a: https://dashboard.ngrok.com/get-started/your-authtoken');
      console.error('   2. Copia tu token');
      console.error('   3. Ejecuta: ngrok config add-authtoken TU_TOKEN');
      console.error('\n   Ver: CONFIGURAR_NGROK_TOKEN.md\n');
    }
  });
}, 3000);

nestProcess.on('error', (error) => {
  console.error('❌ Error al iniciar NestJS:', error);
  process.exit(1);
});

