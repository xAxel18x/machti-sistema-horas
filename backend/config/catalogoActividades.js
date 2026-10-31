const ACTIVIDADES_POR_SERVICIO = new Map([
  [
    'Soporte Nivel 1 (Helpdesk)',
    [
      'Atención de incidencias',
      'Configuración de equipos',
      'Instalación de software',
      'Soporte a usuarios',
    ],
  ],
  [
    'Soporte Nivel 2 (Especializado)',
    [
      'Diagnóstico avanzado de incidencias',
      'Resolución de incidencias escaladas',
      'Análisis de causa raíz',
      'Aplicación de soluciones especializadas',
    ],
  ],
  [
    'Consultoría Cloud & DevOps',
    [
      'Configuración de infraestructura cloud',
      'Implementación de pipelines',
      'Automatización de despliegues',
      'Monitoreo de servicios cloud',
    ],
  ],
  [
    'Desarrollo de Software a Medida',
    [
      'Análisis de requerimientos',
      'Desarrollo de funcionalidades',
      'Corrección de errores',
      'Pruebas de software',
    ],
  ],
  [
    'Auditoría y Seguridad TI',
    [
      'Revisión de vulnerabilidades',
      'Evaluación de controles de seguridad',
      'Revisión de configuraciones de seguridad',
      'Elaboración de informe de auditoría',
    ],
  ],
  [
    'Gestión de Infraestructura y Redes',
    [
      'Configuración de redes',
      'Mantenimiento de servidores',
      'Monitoreo de infraestructura',
      'Gestión de respaldos',
    ],
  ],
]);

function obtenerActividades(nombreServicio) {
  return ACTIVIDADES_POR_SERVICIO.get(nombreServicio) || [];
}

module.exports = {
  obtenerActividades,
};