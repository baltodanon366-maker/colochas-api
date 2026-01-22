import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...\n');

  // Limpiar datos existentes (opcional - comentar si quieres mantener datos)
  console.log('🧹 Limpiando datos existentes...');
  await prisma.auditoria.deleteMany();
  await prisma.alerta.deleteMany();
  await prisma.sorteo.deleteMany();
  await prisma.cierreTurno.deleteMany();
  await prisma.restriccionNumero.deleteMany();
  await prisma.detalleVenta.deleteMany();
  await prisma.venta.deleteMany();
  await prisma.turno.deleteMany();
  await prisma.usuarioRole.deleteMany();
  await prisma.rolePermiso.deleteMany();
  await prisma.user.deleteMany();
  await prisma.permiso.deleteMany();
  await prisma.role.deleteMany();
  await prisma.configuracion.deleteMany();
  console.log('✅ Datos limpiados\n');

  // 1. Crear Roles
  console.log('👥 Creando roles...');
  const adminRole = await prisma.role.create({
    data: {
      nombre: 'admin',
      descripcion: 'Administrador del sistema con acceso completo',
      estado: 'activo',
    },
  });

  const vendedorRole = await prisma.role.create({
    data: {
      nombre: 'vendedor',
      descripcion: 'Vendedor con permisos para realizar ventas',
      estado: 'activo',
    },
  });

  const supervisorRole = await prisma.role.create({
    data: {
      nombre: 'supervisor',
      descripcion: 'Supervisor con permisos de lectura y cierre de turnos',
      estado: 'activo',
    },
  });

  console.log(`✅ Roles creados: ${adminRole.nombre}, ${vendedorRole.nombre}, ${supervisorRole.nombre}\n`);

  // 2. Crear Permisos
  console.log('🔐 Creando permisos...');
  
  const permisos = [
    // Usuarios
    { nombre: 'crear_usuario', descripcion: 'Crear nuevos usuarios', modulo: 'usuarios' },
    { nombre: 'editar_usuario', descripcion: 'Editar usuarios existentes', modulo: 'usuarios' },
    { nombre: 'eliminar_usuario', descripcion: 'Eliminar usuarios', modulo: 'usuarios' },
    { nombre: 'ver_usuarios', descripcion: 'Ver lista de usuarios', modulo: 'usuarios' },
    { nombre: 'asignar_roles', descripcion: 'Asignar roles a usuarios', modulo: 'usuarios' },
    
    // Turnos
    { nombre: 'crear_turno', descripcion: 'Crear nuevos turnos', modulo: 'turnos' },
    { nombre: 'editar_turno', descripcion: 'Editar turnos existentes', modulo: 'turnos' },
    { nombre: 'eliminar_turno', descripcion: 'Eliminar turnos', modulo: 'turnos' },
    { nombre: 'ver_turnos', descripcion: 'Ver lista de turnos', modulo: 'turnos' },
    
    // Ventas
    { nombre: 'crear_venta', descripcion: 'Crear nuevas ventas', modulo: 'ventas' },
    { nombre: 'editar_venta', descripcion: 'Editar ventas existentes', modulo: 'ventas' },
    { nombre: 'eliminar_venta', descripcion: 'Eliminar ventas', modulo: 'ventas' },
    { nombre: 'ver_ventas', descripcion: 'Ver lista de ventas', modulo: 'ventas' },
    { nombre: 'ver_todas_ventas', descripcion: 'Ver todas las ventas del sistema', modulo: 'ventas' },
    
    // Restricciones
    { nombre: 'crear_restriccion', descripcion: 'Crear restricciones de números', modulo: 'restricciones' },
    { nombre: 'editar_restriccion', descripcion: 'Editar restricciones', modulo: 'restricciones' },
    { nombre: 'eliminar_restriccion', descripcion: 'Eliminar restricciones', modulo: 'restricciones' },
    { nombre: 'ver_restricciones', descripcion: 'Ver lista de restricciones', modulo: 'restricciones' },
    
    // Cierres
    { nombre: 'cerrar_turno', descripcion: 'Cerrar turnos', modulo: 'cierres' },
    { nombre: 'ver_cierres', descripcion: 'Ver historial de cierres', modulo: 'cierres' },
    
    // KPIs y Reportes
    { nombre: 'ver_kpis', descripcion: 'Ver KPIs y estadísticas', modulo: 'reportes' },
    { nombre: 'ver_historial', descripcion: 'Ver historial completo', modulo: 'reportes' },
    
    // Configuración
    { nombre: 'editar_configuracion', descripcion: 'Editar configuraciones del sistema', modulo: 'configuracion' },
  ];

  const permisosCreados = await Promise.all(
    permisos.map(permiso =>
      prisma.permiso.create({
        data: {
          ...permiso,
          estado: 'activo',
        },
      })
    )
  );

  console.log(`✅ ${permisosCreados.length} permisos creados\n`);

  // 3. Asociar Permisos a Roles
  console.log('🔗 Asociando permisos a roles...');

  // Admin: Todos los permisos
  await Promise.all(
    permisosCreados.map(permiso =>
      prisma.rolePermiso.create({
        data: {
          roleId: adminRole.id,
          permisoId: permiso.id,
        },
      })
    )
  );

  // Vendedor: Permisos básicos de ventas y restricciones
  const permisosVendedor = permisosCreados.filter(p =>
    ['crear_venta', 'ver_ventas', 'ver_turnos', 'ver_restricciones', 'ver_kpis'].includes(p.nombre)
  );
  await Promise.all(
    permisosVendedor.map(permiso =>
      prisma.rolePermiso.create({
        data: {
          roleId: vendedorRole.id,
          permisoId: permiso.id,
        },
      })
    )
  );

  // Supervisor: Permisos de lectura y cierre
  const permisosSupervisor = permisosCreados.filter(p =>
    [
      'ver_usuarios',
      'ver_turnos',
      'ver_ventas',
      'ver_todas_ventas',
      'ver_restricciones',
      'cerrar_turno',
      'ver_cierres',
      'ver_kpis',
      'ver_historial',
    ].includes(p.nombre)
  );
  await Promise.all(
    permisosSupervisor.map(permiso =>
      prisma.rolePermiso.create({
        data: {
          roleId: supervisorRole.id,
          permisoId: permiso.id,
        },
      })
    )
  );

  console.log('✅ Permisos asociados a roles\n');

  // 4. Crear Usuarios de Prueba
  console.log('👤 Creando usuarios de prueba...');

  // Hash de contraseñas específicas para cada rol
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const vendedorPasswordHash = await bcrypt.hash('vendedor123', 10);
  const supervisorPasswordHash = await bcrypt.hash('supervisor123', 10);

  // Usuario Admin
  const adminUser = await prisma.user.create({
    data: {
      name: 'Administrador',
      email: 'admin@colochas.com',
      passwordHash: adminPasswordHash,
      estado: 'activo',
    },
  });

  // Usuario Vendedor
  const vendedorUser = await prisma.user.create({
    data: {
      name: 'Juan Vendedor',
      email: 'vendedor@colochas.com',
      passwordHash: vendedorPasswordHash,
      estado: 'activo',
      createdById: adminUser.id,
    },
  });

  // Usuario Supervisor
  const supervisorUser = await prisma.user.create({
    data: {
      name: 'María Supervisor',
      email: 'supervisor@colochas.com',
      passwordHash: supervisorPasswordHash,
      estado: 'activo',
      createdById: adminUser.id,
    },
  });

  // Usuario Vendedor 2 (para pruebas adicionales)
  const vendedor2User = await prisma.user.create({
    data: {
      name: 'Pedro Vendedor',
      email: 'vendedor2@colochas.com',
      passwordHash: vendedorPasswordHash,
      estado: 'activo',
      createdById: adminUser.id,
    },
  });

  console.log('✅ Usuarios creados\n');

  // 5. Asociar Usuarios a Roles
  console.log('🔗 Asociando usuarios a roles...');

  await prisma.usuarioRole.create({
    data: {
      usuarioId: adminUser.id,
      roleId: adminRole.id,
      asignadoPor: adminUser.id,
    },
  });

  await prisma.usuarioRole.create({
    data: {
      usuarioId: vendedorUser.id,
      roleId: vendedorRole.id,
      asignadoPor: adminUser.id,
    },
  });

  await prisma.usuarioRole.create({
    data: {
      usuarioId: supervisorUser.id,
      roleId: supervisorRole.id,
      asignadoPor: adminUser.id,
    },
  });

  await prisma.usuarioRole.create({
    data: {
      usuarioId: vendedor2User.id,
      roleId: vendedorRole.id,
      asignadoPor: adminUser.id,
    },
  });

  console.log('✅ Usuarios asociados a roles\n');

  // 6. Crear Turnos de Prueba
  console.log('⏰ Creando turnos de prueba...');

  const turno1 = await prisma.turno.create({
    data: {
      nombre: 'TURNO MAÑANA',
      hora: '08:00',
      horaCierre: '12:00',
      tiempoAlerta: 10,
      tiempoBloqueo: 5,
      descripcion: 'Turno de la mañana',
      estado: 'activo',
      createdById: adminUser.id,
    },
  });

  const turno2 = await prisma.turno.create({
    data: {
      nombre: 'TURNO TARDE',
      hora: '14:00',
      horaCierre: '18:00',
      tiempoAlerta: 10,
      tiempoBloqueo: 5,
      descripcion: 'Turno de la tarde',
      estado: 'activo',
      createdById: adminUser.id,
    },
  });

  const turno3 = await prisma.turno.create({
    data: {
      nombre: 'TURNO NOCHE',
      hora: '18:00',
      horaCierre: '22:00',
      tiempoAlerta: 10,
      tiempoBloqueo: 5,
      descripcion: 'Turno de la noche',
      estado: 'activo',
      createdById: adminUser.id,
    },
  });

  console.log(`✅ ${3} turnos creados\n`);

  // Resumen
  console.log('📊 Resumen de datos creados:');
  console.log(`   - Roles: ${3}`);
  console.log(`   - Permisos: ${permisosCreados.length}`);
  console.log(`   - Usuarios: ${4}`);
  console.log(`   - Turnos: ${3}`);
  console.log('\n👤 Usuarios de prueba creados:');
  console.log('   🔑 Admin:');
  console.log(`     Email: admin@colochas.com`);
  console.log(`     Password: admin123`);
  console.log(`     Rol: admin`);
  console.log('   🔑 Vendedor:');
  console.log(`     Email: vendedor@colochas.com`);
  console.log(`     Password: vendedor123`);
  console.log(`     Rol: vendedor`);
  console.log('   🔑 Supervisor:');
  console.log(`     Email: supervisor@colochas.com`);
  console.log(`     Password: supervisor123`);
  console.log(`     Rol: supervisor`);
  console.log('   🔑 Vendedor 2:');
  console.log(`     Email: vendedor2@colochas.com`);
  console.log(`     Password: vendedor123`);
  console.log(`     Rol: vendedor`);
  console.log('\n✅ Seed completado exitosamente! 🎉');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

