-- SIGMAP - Datos de prueba
-- Usuarios de prueba: contrasena 'sigmap123' (almacenada como hash bcrypt)

PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

-- usuarios (4 registros)
INSERT INTO usuarios (id, nombre, email, password_hash, rol, creado_en) VALUES (1, 'Edgar Arias', 'gerencia@sigmap.do', '$2b$10$Owg2PzhL3V5XWjsQkfN3ouJ4DbhWl0Q4DwrfeKVrlhAiDLxh8GjXC', 'gerencia', '2026-10-14 17:28:42');
INSERT INTO usuarios (id, nombre, email, password_hash, rol, creado_en) VALUES (2, 'Luis Peralta', 'supervisor@sigmap.do', '$2b$10$dqwMQJtg90kIQXaeFwujpOdxVLxxThnb0w69z3G2Xew5D3gWqIsR6', 'supervisor', '2026-10-14 17:28:42');
INSERT INTO usuarios (id, nombre, email, password_hash, rol, creado_en) VALUES (3, 'Ramón Cruz', 'tecnico@sigmap.do', '$2b$10$OaqV3pbb.ribQLPe9o.mkeUgm3LwJHEr6k/UJNTuuPpjs0/1RnXk6', 'tecnico', '2026-10-14 17:28:42');
INSERT INTO usuarios (id, nombre, email, password_hash, rol, creado_en) VALUES (4, 'Ana Batista', 'operador@sigmap.do', '$2b$10$HPTaX8a0AFfiGRPwrI.5e.FdKPODz1LcaTfTM6xa3uXWO6sP9WJTu', 'operador', '2026-10-14 17:28:42');

-- maquinas (6 registros)
INSERT INTO maquinas (id, codigo, nombre, tipo, area, estado, creado_en) VALUES (1, 'INY-01', 'Inyectora Husky 160T', 'inyeccion', 'Nave A', 'operativa', '2026-10-14 17:28:42');
INSERT INTO maquinas (id, codigo, nombre, tipo, area, estado, creado_en) VALUES (2, 'INY-02', 'Inyectora Engel 250T', 'inyeccion', 'Nave A', 'en_mantenimiento', '2026-10-14 17:28:42');
INSERT INTO maquinas (id, codigo, nombre, tipo, area, estado, creado_en) VALUES (3, 'SOP-01', 'Sopladora Aoki AL-250', 'soplado', 'Nave B', 'operativa', '2026-10-14 17:28:42');
INSERT INTO maquinas (id, codigo, nombre, tipo, area, estado, creado_en) VALUES (4, 'SOP-02', 'Sopladora Nissei ASB-70', 'soplado', 'Nave B', 'detenida', '2026-10-14 17:28:42');
INSERT INTO maquinas (id, codigo, nombre, tipo, area, estado, creado_en) VALUES (5, 'AUX-01', 'Compresor Atlas Copco GA-30', 'auxiliar', 'Cuarto de máquinas', 'operativa', '2026-10-14 17:28:42');
INSERT INTO maquinas (id, codigo, nombre, tipo, area, estado, creado_en) VALUES (6, 'AUX-02', 'Chiller Trane CGAM-40', 'auxiliar', 'Cuarto de máquinas', 'operativa', '2026-10-14 17:28:42');

-- ordenes (6 registros)
INSERT INTO ordenes (id, folio, maquina_id, tipo, prioridad, estado, descripcion, reportado_por, tecnico_id, abierta_en, cerrada_en, downtime_min) VALUES (1, 'OT-1001', 2, 'correctivo', 'alta', 'cerrada', 'Fuga de aceite hidráulico en la unidad de cierre.', 4, 3, '2026-08-03 07:20', '2026-08-03 11:50', 270);
INSERT INTO ordenes (id, folio, maquina_id, tipo, prioridad, estado, descripcion, reportado_por, tecnico_id, abierta_en, cerrada_en, downtime_min) VALUES (2, 'OT-1002', 1, 'preventivo', 'media', 'cerrada', 'Mantenimiento programado de 500 horas: lubricación y revisión de husillo.', 2, 3, '2026-08-06 08:00', '2026-08-06 10:30', 150);
INSERT INTO ordenes (id, folio, maquina_id, tipo, prioridad, estado, descripcion, reportado_por, tecnico_id, abierta_en, cerrada_en, downtime_min) VALUES (3, 'OT-1003', 4, 'correctivo', 'critica', 'en_proceso', 'Sopladora se detiene por falla de sensor de posición de molde.', 4, 3, '2026-09-09 14:10', NULL, NULL);
INSERT INTO ordenes (id, folio, maquina_id, tipo, prioridad, estado, descripcion, reportado_por, tecnico_id, abierta_en, cerrada_en, downtime_min) VALUES (4, 'OT-1004', 3, 'correctivo', 'media', 'asignada', 'Variación en el espesor de pared de la botella de 1L.', 4, 3, '2026-09-11 09:45', NULL, NULL);
INSERT INTO ordenes (id, folio, maquina_id, tipo, prioridad, estado, descripcion, reportado_por, tecnico_id, abierta_en, cerrada_en, downtime_min) VALUES (5, 'OT-1005', 6, 'preventivo', 'baja', 'abierta', 'Limpieza de condensador y revisión de niveles de refrigerante.', 2, NULL, '2026-09-12 08:15', NULL, NULL);
INSERT INTO ordenes (id, folio, maquina_id, tipo, prioridad, estado, descripcion, reportado_por, tecnico_id, abierta_en, cerrada_en, downtime_min) VALUES (6, 'OT-1006', 2, 'correctivo', 'alta', 'cerrada', 'Nueva fuga de aceite en la misma unidad de cierre.', 4, 3, '2026-08-28 06:40', '2026-08-28 12:10', 330);

-- causa_raiz (3 registros)
INSERT INTO causa_raiz (id, orden_id, porque_1, porque_2, porque_3, porque_4, porque_5, causa_identificada, categoria, accion_correctiva, registrado_por, registrado_en) VALUES (1, 1, 'La máquina presentó fuga de aceite.', 'El sello de la unidad de cierre estaba dañado.', 'El sello trabajó a una presión superior a la nominal.', 'La válvula reguladora de presión estaba descalibrada.', 'No existe rutina de calibración periódica de la válvula.', 'Ausencia de una rutina preventiva de calibración de la válvula reguladora de presión.', 'metodo', 'Incluir la calibración de la válvula reguladora en el plan preventivo trimestral y reemplazar el sello.', 3, '2026-10-14 17:28:42');
INSERT INTO causa_raiz (id, orden_id, porque_1, porque_2, porque_3, porque_4, porque_5, causa_identificada, categoria, accion_correctiva, registrado_por, registrado_en) VALUES (2, 6, 'Se repitió la fuga de aceite en la unidad de cierre.', 'El sello sustituido volvió a fallar antes de lo esperado.', 'El sello instalado no corresponde a la especificación del fabricante.', 'Se utilizó un repuesto genérico disponible en almacén.', 'El almacén no tenía el repuesto original en existencia.', 'Uso de repuesto genérico fuera de especificación por falta de stock del original.', 'material', 'Establecer stock mínimo del sello original y prohibir sustitución por genéricos en unidades hidráulicas.', 3, '2026-10-14 17:28:42');
INSERT INTO causa_raiz (id, orden_id, porque_1, porque_2, porque_3, porque_4, porque_5, causa_identificada, categoria, accion_correctiva, registrado_por, registrado_en) VALUES (3, 2, 'Se realizó el mantenimiento de 500 horas.', 'Se detectó desgaste leve en el husillo.', NULL, NULL, NULL, 'Desgaste normal por horas de operación, dentro de tolerancia.', 'maquina', 'Mantener la frecuencia preventiva actual y monitorear el desgaste en el próximo ciclo.', 3, '2026-10-14 17:28:42');

-- notificaciones (3 registros)
INSERT INTO notificaciones (id, usuario_id, mensaje, leida, creada_en) VALUES (1, 3, 'Se te asignó la orden OT-1003 (prioridad crítica) en SOP-02.', 0, '2026-10-14 17:28:42');
INSERT INTO notificaciones (id, usuario_id, mensaje, leida, creada_en) VALUES (2, 2, 'La máquina SOP-02 lleva más de 24 horas detenida.', 0, '2026-10-14 17:28:42');
INSERT INTO notificaciones (id, usuario_id, mensaje, leida, creada_en) VALUES (3, 3, 'Se te asignó la orden OT-1004 en SOP-01.', 0, '2026-10-14 17:28:42');

COMMIT;
