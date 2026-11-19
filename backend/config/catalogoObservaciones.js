const MOTIVOS_OBSERVACION = Object.freeze([
    'La actividad seleccionada no corresponde al trabajo realizado.',
    'La cantidad de horas requiere revisión.',
    'La fecha registrada no corresponde al trabajo realizado.',
    'El servicio seleccionado no corresponde al trabajo realizado.',
    'El registro parece estar duplicado.',
    'Se requiere sustento adicional del trabajo realizado.',
]);

function esMotivoValido(motivo) {
    return (
        typeof motivo === 'string' &&
        MOTIVOS_OBSERVACION.includes(motivo)
    );
}

module.exports = {
    MOTIVOS_OBSERVACION,
    esMotivoValido,
};